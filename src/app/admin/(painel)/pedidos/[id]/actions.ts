"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/auth";
import { asaasConfigurado, ErroAsaas, garantirTabelasPagamento } from "@/lib/asaas";
import { cancelarLink, criarCobranca } from "@/lib/cobranca";

type Resultado = { ok: true; url?: string } | { ok: false; erro: string };

/** Gera o link de pagamento do pedido (produtos + taxa). Links pendentes anteriores são cancelados. */
export async function gerarCobranca(pedidoId: number, taxaEntrega: number): Promise<Resultado> {
  await exigirAdmin();
  if (!asaasConfigurado()) return { ok: false, erro: "Pagamento online não configurado: falta a chave do Asaas (ASAAS_API_KEY) no servidor." };
  if (!Number.isInteger(taxaEntrega) || taxaEntrega < 0 || taxaEntrega > 100_000) return { ok: false, erro: "Taxa de entrega inválida." };
  try {
    await garantirTabelasPagamento();
    const [pedido] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pedidoId));
    if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
    if (pedido.status === "cancelado") return { ok: false, erro: "Pedido cancelado: não dá para cobrar." };
    const cobrancas = await db.select().from(schema.cobrancas).where(eq(schema.cobrancas.pedidoId, pedidoId));
    if (cobrancas.some((c) => c.status === "pago")) return { ok: false, erro: "Este pedido já foi pago." };

    for (const c of cobrancas.filter((c) => c.status === "pendente")) await cancelarLink(c);
    const url = await criarCobranca(pedido, taxaEntrega);
    revalidatePath(`/admin/pedidos/${pedidoId}`);
    return { ok: true, url };
  } catch (e) {
    console.error("gerarCobranca:", e);
    return { ok: false, erro: e instanceof ErroAsaas ? e.message : "Não foi possível gerar o link agora. Tente de novo." };
  }
}

export async function cancelarCobranca(cobrancaId: number): Promise<Resultado> {
  await exigirAdmin();
  try {
    await garantirTabelasPagamento();
    const [c] = await db.select().from(schema.cobrancas).where(and(eq(schema.cobrancas.id, cobrancaId), eq(schema.cobrancas.status, "pendente")));
    if (!c) return { ok: false, erro: "Só links aguardando pagamento podem ser cancelados." };
    await cancelarLink(c);
    revalidatePath(`/admin/pedidos/${c.pedidoId}`);
    return { ok: true };
  } catch (e) {
    console.error("cancelarCobranca:", e);
    return { ok: false, erro: e instanceof ErroAsaas ? e.message : "Não foi possível cancelar agora." };
  }
}
