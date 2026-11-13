import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { garantirTabelasPagamento } from "@/lib/asaas";
import { pedidoDaReferencia, podeMudarStatus, statusPorEvento, tokenConfere } from "@/lib/pagamento";

/**
 * Webhook do Asaas (cadastrado no painel do Asaas em Integrações → Webhooks, URL
 * https://imperiodasrosas.com/api/asaas/webhook). Atualiza a cobrança e confirma o pedido quando pago.
 * Responde rápido e sempre 2xx para eventos que não interessam; 5xx só em erro nosso, para o Asaas tentar de novo.
 */
type Evento = {
  id?: unknown;
  event?: unknown;
  payment?: { id?: string; paymentLink?: string | null; externalReference?: string | null; billingType?: string; paymentDate?: string | null; confirmedDate?: string | null };
};

export async function POST(request: Request) {
  if (!tokenConfere(request.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return Response.json({ erro: "token inválido" }, { status: 401 });
  }
  let corpo: Evento;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const { id, event, payment } = corpo ?? {};
  if (typeof id !== "string" || typeof event !== "string") return Response.json({ erro: "evento sem id" }, { status: 400 });

  try {
    await garantirTabelasPagamento();
    const [jaVisto] = await db.select({ id: schema.asaasEventos.id }).from(schema.asaasEventos).where(eq(schema.asaasEventos.id, id));
    if (jaVisto) return Response.json({ ok: true, repetido: true });

    const novo = statusPorEvento(event);
    if (novo && payment) {
      // cobrança pelo link que originou o pagamento; Pix do site, pelo id da cobrança (pay_…);
      // sem nenhum dos dois, pela referência "pedido:N" (última cobrança do pedido)
      const chave = payment.paymentLink ?? payment.id;
      let [cobranca] = chave ? await db.select().from(schema.cobrancas).where(eq(schema.cobrancas.asaasLinkId, chave)) : [];
      const pedidoRef = pedidoDaReferencia(payment.externalReference);
      if (!cobranca && pedidoRef) {
        [cobranca] = await db.select().from(schema.cobrancas).where(eq(schema.cobrancas.pedidoId, pedidoRef)).orderBy(desc(schema.cobrancas.criadoEm)).limit(1);
      }
      if (!cobranca) {
        console.warn(`asaas: ${event} ${payment.id ?? ""} sem cobrança correspondente (link ${payment.paymentLink ?? "-"})`);
      } else if (podeMudarStatus(cobranca.status, novo)) {
        const quando = payment.paymentDate ?? payment.confirmedDate;
        await db
          .update(schema.cobrancas)
          .set({
            status: novo,
            asaasPagamentoId: payment.id ?? cobranca.asaasPagamentoId,
            forma: payment.billingType ?? cobranca.forma,
            ...(novo === "pago" && { pagoEm: quando ? new Date(`${quando}T12:00:00-03:00`) : new Date() }),
            atualizadoEm: new Date(),
          })
          .where(eq(schema.cobrancas.id, cobranca.id));
        if (novo === "pago") {
          // pedido "novo" ou "aguardando pagamento" (checkout do site) vira "confirmado"; os já em preparo etc. ficam como estão
          await db
            .update(schema.pedidos)
            .set({ status: "confirmado" })
            .where(and(eq(schema.pedidos.id, cobranca.pedidoId), inArray(schema.pedidos.status, ["novo", "pagamento"])));
        }
      }
    }
    await db.insert(schema.asaasEventos).values({ id, evento: event }).onConflictDoNothing();
    return Response.json({ ok: true });
  } catch (e) {
    console.error("asaas webhook:", e);
    return Response.json({ erro: "falha ao processar" }, { status: 500 });
  }
}
