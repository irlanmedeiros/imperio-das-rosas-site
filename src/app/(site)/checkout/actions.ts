"use server";

import { inArray, and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { cobrancasDoPedido, criarCobranca, pagamentoNoSiteAtivo } from "@/lib/cobranca";
import { getLoja } from "@/lib/data";
import { taxaEntrega } from "@/lib/entrega";
import { entradaPedidoSchema, errosPorCampo, hojeRecife, montarItens, novoCodigo, type EntradaPedido } from "@/lib/pedido";

export type { EntradaPedido } from "@/lib/pedido";
/** `pagamentoUrl`: o cliente vai para o Asaas pagar; sem ela, segue direto para o WhatsApp. */
export type ResultadoPedido = { ok: true; codigo: string; pagamentoUrl?: string } | { ok: false; erros: Record<string, string>; mensagem?: string };

export async function criarPedido(dados: EntradaPedido): Promise<ResultadoPedido> {
  const r = entradaPedidoSchema.safeParse(dados);
  if (!r.success) return { ok: false, erros: errosPorCampo(r.error.issues) };
  const d = r.data;
  if (d.dataEntrega < hojeRecife()) return { ok: false, erros: { dataEntrega: "Escolha hoje ou uma data futura" } };

  // preços sempre do banco, nunca do navegador
  const ids = [...new Set(d.itens.map((i) => i.id))];
  const produtos = await db
    .select({ id: schema.produtos.id, nome: schema.produtos.nome, preco: schema.produtos.preco, foto: schema.produtos.foto })
    .from(schema.produtos)
    .where(and(inArray(schema.produtos.id, ids), eq(schema.produtos.ativo, true)));
  const { itens, total } = montarItens(d.itens, produtos);
  if (itens.length === 0) return { ok: false, erros: {}, mensagem: "Os produtos do carrinho não estão mais disponíveis." };

  const loja = await getLoja();
  if (total < loja.pedidoMinimoCentavos) {
    return { ok: false, erros: {}, mensagem: "Seu pedido ainda não atingiu o valor mínimo." };
  }

  const entrega = d.tipoEntrega === "entrega";
  // taxa também do servidor (lista de bairros do painel); sem taxa conhecida, a entrega é combinada no WhatsApp
  const taxa = taxaEntrega(d.tipoEntrega, d.bairro, loja.taxasEntrega, loja.taxaOutrosBairros);
  const cobrarNoSite = pagamentoNoSiteAtivo(loja) && taxa !== null;

  let pedido: typeof schema.pedidos.$inferSelect | undefined;
  for (let tentativa = 0; tentativa < 4 && !pedido; tentativa++) {
    try {
      [pedido] = await db
        .insert(schema.pedidos)
        .values({
          codigo: novoCodigo(),
          status: cobrarNoSite ? "pagamento" : "novo",
          clienteNome: d.clienteNome,
          clienteTelefone: d.clienteTelefone.trim(),
          tipoEntrega: d.tipoEntrega,
          endereco: entrega ? d.endereco : null,
          bairro: entrega ? d.bairro : null,
          dataEntrega: d.dataEntrega,
          periodo: d.periodo || null,
          destinatario: d.destinatario || null,
          mensagemCartao: d.mensagemCartao || null,
          observacoes: d.observacoes || null,
          itens,
          total,
        })
        .returning();
    } catch (e) {
      if (!String(e).includes("unique")) throw e;
    }
  }
  if (!pedido) return { ok: false, erros: {}, mensagem: "Não foi possível registrar o pedido. Tente novamente." };
  if (!cobrarNoSite) return { ok: true, codigo: pedido.codigo };

  try {
    return { ok: true, codigo: pedido.codigo, pagamentoUrl: await criarCobranca(pedido, taxa) };
  } catch (e) {
    // Asaas fora do ar ou recusou: o pedido não se perde, segue pelo WhatsApp como antes
    console.error("checkout: link de pagamento falhou", e);
    await db.update(schema.pedidos).set({ status: "novo" }).where(eq(schema.pedidos.id, pedido.id));
    return { ok: true, codigo: pedido.codigo };
  }
}

/**
 * Botão "Pagar agora" da página do pedido: devolve o link que está valendo ou, se ele venceu/foi cancelado,
 * gera outro com a mesma taxa. Só para pedidos do site que ainda aguardam pagamento.
 */
export async function pagarPedido(codigo: string): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  if (!/^IR-[A-Z0-9]{6}$/.test(codigo)) return { ok: false, erro: "Pedido não encontrado." };
  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  const cobrancas = await cobrancasDoPedido(pedido.id);
  if (cobrancas.some((c) => c.status === "pago")) return { ok: false, erro: "Este pedido já está pago." };
  if (pedido.status !== "pagamento") return { ok: false, erro: "Este pedido não está mais aguardando pagamento. Fale com a loja pelo WhatsApp." };
  const pendente = cobrancas.find((c) => c.status === "pendente");
  if (pendente) return { ok: true, url: pendente.url };
  try {
    return { ok: true, url: await criarCobranca(pedido, cobrancas[0]?.taxaEntrega ?? 0) };
  } catch (e) {
    console.error("pagarPedido:", e);
    return { ok: false, erro: "Não foi possível abrir o pagamento agora. Tente de novo em instantes ou fale com a loja pelo WhatsApp." };
  }
}
