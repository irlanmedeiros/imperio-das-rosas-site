"use server";

import { inArray, and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { garantirEsquema } from "@/db/esquema";
import { clienteAsaas, ErroAsaas } from "@/lib/asaas";
import { clienteDoPedido, cobrancasDoPedido, criarCobranca, criarCobrancaPix, pagamentoNoSiteAtivo, pixDoPedido, type DadosPix } from "@/lib/cobranca";
import { getLoja } from "@/lib/data";
import { cpfValido, entradaPedidoSchema, errosPorCampo, hojeRecife, montarItens, novoCodigo, type EntradaPedido } from "@/lib/pedido";

export type { EntradaPedido } from "@/lib/pedido";
/**
 * `pix`: abre a página do pedido com o Pix na tela; `pagamentoUrl`: vai para o Asaas pagar com cartão;
 * sem nenhum dos dois, segue direto para o WhatsApp.
 */
export type ResultadoPedido = { ok: true; codigo: string; pix?: boolean; pagamentoUrl?: string } | { ok: false; erros: Record<string, string>; mensagem?: string };

export async function criarPedido(dados: EntradaPedido): Promise<ResultadoPedido> {
  await garantirEsquema();
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
  // no site o cliente paga só os produtos; a taxa de entrega é combinada com a loja no WhatsApp
  const cobrarNoSite = pagamentoNoSiteAtivo(loja);
  const pix = cobrarNoSite && d.forma !== "cartao";
  let asaasClienteId: string | null = null;
  if (pix) {
    if (!d.cpf || !cpfValido(d.cpf)) return { ok: false, erros: { cpf: "Informe um CPF válido (é pedido pelo banco para gerar o Pix)" } };
    try {
      asaasClienteId = await clienteAsaas({ nome: d.clienteNome, cpf: d.cpf.replace(/\D/g, ""), celular: d.clienteTelefone.replace(/\D/g, ""), ref: "site" });
    } catch (e) {
      console.error("checkout: cliente Asaas", e);
      const msg = e instanceof ErroAsaas && /cpf/i.test(e.message) ? e.message.replace(/^O Asaas recusou o pedido: /, "") : "Não foi possível preparar o Pix agora. Tente de novo ou escolha cartão.";
      return { ok: false, erros: /cpf/i.test(msg) ? { cpf: msg } : {}, mensagem: msg };
    }
  }

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
          asaasClienteId,
        })
        .returning();
    } catch (e) {
      if (!String(e).includes("unique")) throw e;
    }
  }
  if (!pedido) return { ok: false, erros: {}, mensagem: "Não foi possível registrar o pedido. Tente novamente." };
  if (!cobrarNoSite) return { ok: true, codigo: pedido.codigo };

  try {
    if (pix) {
      await criarCobrancaPix(pedido, asaasClienteId!);
      return { ok: true, codigo: pedido.codigo, pix: true };
    }
    return { ok: true, codigo: pedido.codigo, pagamentoUrl: await criarCobranca(pedido, 0) };
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
  await garantirEsquema();
  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  const cobrancas = await cobrancasDoPedido(pedido.id);
  if (cobrancas.some((c) => c.status === "pago")) return { ok: false, erro: "Este pedido já está pago." };
  if (pedido.status !== "pagamento") return { ok: false, erro: "Este pedido não está mais aguardando pagamento. Fale com a loja pelo WhatsApp." };
  const pendente = cobrancas.find((c) => c.status === "pendente" && c.tipo === "link");
  if (pendente) return { ok: true, url: pendente.url };
  try {
    return { ok: true, url: await criarCobranca(pedido, cobrancas[0]?.taxaEntrega ?? 0) };
  } catch (e) {
    console.error("pagarPedido:", e);
    return { ok: false, erro: "Não foi possível abrir o pagamento agora. Tente de novo em instantes ou fale com a loja pelo WhatsApp." };
  }
}

export type ResultadoPix = { ok: true; pix: DadosPix } | { ok: false; erro: string; precisaCpf?: boolean; pago?: boolean };

/**
 * Pix dentro do site (janela da página do pedido): QR Code + copia e cola do Pix que vale agora.
 * Se o pedido ainda não tem o CPF de quem paga (veio pelo cartão), pede o CPF.
 */
export async function gerarPix(codigo: string, cpf?: string): Promise<ResultadoPix> {
  if (!/^IR-[A-Z0-9]{6}$/.test(codigo)) return { ok: false, erro: "Pedido não encontrado." };
  await garantirEsquema();
  const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo));
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  const cobrancas = await cobrancasDoPedido(pedido.id);
  if (cobrancas.some((c) => c.status === "pago")) return { ok: false, erro: "Este pedido já está pago.", pago: true };
  if (pedido.status !== "pagamento") return { ok: false, erro: "Este pedido não está mais aguardando pagamento. Fale com a loja pelo WhatsApp." };
  try {
    if (!pedido.asaasClienteId) {
      if (!cpf) return { ok: false, erro: "Informe o CPF de quem vai pagar.", precisaCpf: true };
      if (!cpfValido(cpf)) return { ok: false, erro: "CPF inválido. Confira os números.", precisaCpf: true };
      pedido.asaasClienteId = await clienteDoPedido(pedido, cpf);
    }
    return { ok: true, pix: await pixDoPedido(pedido) };
  } catch (e) {
    console.error("gerarPix:", e);
    return { ok: false, erro: "Não foi possível gerar o Pix agora. Tente de novo em instantes ou pague com cartão." };
  }
}

