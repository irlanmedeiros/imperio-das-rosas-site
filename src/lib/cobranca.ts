import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { garantirEsquema } from "@/db/esquema";
import { asaasConfigurado, clienteAsaas, criarLinkPagamento, criarPagamento, ErroAsaas, qrCodePix, removerLinkPagamento, removerPagamento } from "./asaas";
import type { Loja } from "./config-types";
import { corpoLinkPagamento, corpoPagamentoPix } from "./pagamento";
import { hojeRecife } from "./pedido";

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

/** Cancela no Asaas e marca como cancelado (link ou Pix que não deve mais ser pago). */
export async function cancelarLink(cobranca: { id: number; asaasLinkId: string; tipo?: "link" | "pix" }) {
  try {
    if (cobranca.tipo === "pix") await removerPagamento(cobranca.asaasLinkId);
    else await removerLinkPagamento(cobranca.asaasLinkId);
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

/** Cliente do Asaas do pedido (pelo CPF), guardado no pedido para gerar outro Pix depois sem pedir o CPF de novo. */
export async function clienteDoPedido(pedido: PedidoParaCobrar, cpf: string) {
  const id = await clienteAsaas({ nome: pedido.clienteNome, cpf: cpf.replace(/\D/g, ""), celular: pedido.clienteTelefone.replace(/\D/g, ""), ref: `pedido:${pedido.id}` });
  await db.update(schema.pedidos).set({ asaasClienteId: id }).where(eq(schema.pedidos.id, pedido.id));
  return id;
}

/** Cria a cobrança Pix (vence hoje) e registra. */
export async function criarCobrancaPix(pedido: PedidoParaCobrar, clienteId: string, taxaEntrega = 0) {
  await garantirEsquema();
  const pag = await criarPagamento(corpoPagamentoPix(pedido, clienteId, taxaEntrega, hojeRecife()));
  const [c] = await db
    .insert(schema.cobrancas)
    .values({ pedidoId: pedido.id, tipo: "pix", asaasLinkId: pag.id, asaasPagamentoId: pag.id, url: pag.invoiceUrl, valor: pedido.total + taxaEntrega, taxaEntrega })
    .returning();
  return c;
}

export type DadosPix = { valor: number; imagem: string; codigo: string; expira: string | null };

/**
 * Pix que vale agora para o pedido: reaproveita o de hoje; se só houver de outro dia (vencido), cancela e gera outro.
 * Precisa do cliente do Asaas (CPF) no pedido.
 */
export async function pixDoPedido(pedido: PedidoParaCobrar): Promise<DadosPix> {
  if (!pedido.asaasClienteId) throw new ErroAsaas("Informe o CPF para gerar o Pix.");
  const cobrancas = await cobrancasDoPedido(pedido.id);
  const hoje = hojeRecife();
  let pix = cobrancas.find((c) => c.tipo === "pix" && c.status === "pendente" && hojeRecife(c.criadoEm) === hoje);
  for (const velha of cobrancas.filter((c) => c.tipo === "pix" && c.status === "pendente" && c !== pix)) {
    await cancelarLink(velha).catch((e) => console.warn("pix antigo não cancelado:", e));
  }
  pix ??= await criarCobrancaPix(pedido, pedido.asaasClienteId, cobrancas[0]?.taxaEntrega ?? 0);
  const qr = await qrCodePix(pix.asaasLinkId);
  return { valor: pix.valor, imagem: `data:image/png;base64,${qr.encodedImage}`, codigo: qr.payload, expira: qr.expirationDate ?? null };
}

