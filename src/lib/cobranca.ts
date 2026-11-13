import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { garantirEsquema } from "@/db/esquema";
import { asaasConfigurado, criarLinkPagamento, ErroAsaas, removerLinkPagamento } from "./asaas";
import type { Loja } from "./config-types";
import { corpoLinkPagamento } from "./pagamento";

export const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imperiodasrosas.com";

/** O checkout cobra pelo site? (chave do Asaas no servidor + opção ligada em Configurações) */
export function pagamentoNoSiteAtivo(loja: Pick<Loja, "pagamentoNoSite">) {
  return asaasConfigurado() && loja.pagamentoNoSite;
}

type PedidoParaCobrar = typeof schema.pedidos.$inferSelect;

/** Cria o link de pagamento no Asaas (produtos + taxa) e registra a cobrança. Devolve a URL do link. */
export async function criarCobranca(pedido: PedidoParaCobrar, taxaEntrega: number) {
  await garantirEsquema();
  const link = await criarLinkPagamento(corpoLinkPagamento(pedido, taxaEntrega, URL_SITE));
  await db.insert(schema.cobrancas).values({ pedidoId: pedido.id, asaasLinkId: link.id, url: link.url, valor: pedido.total + taxaEntrega, taxaEntrega });
  return link.url;
}

/** Cancela no Asaas e marca como cancelado (link que não deve mais ser pago). */
export async function cancelarLink(cobranca: { id: number; asaasLinkId: string }) {
  try {
    await removerLinkPagamento(cobranca.asaasLinkId);
  } catch (e) {
    // link já removido no painel do Asaas: segue e marca como cancelado
    if (!(e instanceof ErroAsaas) || !/404|not found|não encontrad/i.test(e.message)) throw e;
  }
  await db.update(schema.cobrancas).set({ status: "cancelado", atualizadoEm: new Date() }).where(eq(schema.cobrancas.id, cobranca.id));
}

/** Cobranças do pedido, da mais nova para a mais antiga. */
export async function cobrancasDoPedido(pedidoId: number) {
  await garantirEsquema();
  return db.select().from(schema.cobrancas).where(eq(schema.cobrancas.pedidoId, pedidoId)).orderBy(desc(schema.cobrancas.criadoEm), desc(schema.cobrancas.id));
}
