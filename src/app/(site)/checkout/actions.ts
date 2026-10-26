"use server";

import { inArray, and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getLoja } from "@/lib/data";
import { entradaPedidoSchema, errosPorCampo, hojeRecife, montarItens, novoCodigo, type EntradaPedido } from "@/lib/pedido";

export type { EntradaPedido } from "@/lib/pedido";
export type ResultadoPedido = { ok: true; codigo: string } | { ok: false; erros: Record<string, string>; mensagem?: string };

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
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const codigo = novoCodigo();
    try {
      await db.insert(schema.pedidos).values({
        codigo,
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
      });
      return { ok: true, codigo };
    } catch (e) {
      if (!String(e).includes("unique")) throw e;
    }
  }
  return { ok: false, erros: {}, mensagem: "Não foi possível registrar o pedido. Tente novamente." };
}
