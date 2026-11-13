/**
 * Webhook do Asaas contra o Postgres LOCAL (.env.local com DATABASE_URL em localhost).
 * Sem banco local, o teste é pulado.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const TOKEN = "token-de-teste-do-webhook-com-mais-de-32-caracteres";

describe.skipIf(!local)("webhook do Asaas (banco local)", async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN;
  const { db, schema } = await import("@/db");
  const { eq, inArray } = await import("drizzle-orm");
  const { garantirTabelasPagamento } = await import("@/lib/asaas");
  const { POST } = await import("@/app/api/asaas/webhook/route");
  const sufixo = Date.now().toString(36);
  const link = `lnk_teste_${sufixo}`;
  let pedidoId = 0;
  const eventos: string[] = [];

  const enviar = (corpo: object, token = TOKEN) =>
    POST(new Request("http://localhost/api/asaas/webhook", { method: "POST", headers: { "asaas-access-token": token, "content-type": "application/json" }, body: JSON.stringify(corpo) }));
  const evento = (event: string, extra: object = {}) => {
    const id = `evt_${sufixo}_${eventos.length}`;
    eventos.push(id);
    return { id, event, payment: { id: `pay_${sufixo}`, paymentLink: link, billingType: "PIX", paymentDate: "2026-11-09", ...extra } };
  };
  const estado = async () => {
    const [c] = await db.select().from(schema.cobrancas).where(eq(schema.cobrancas.asaasLinkId, link));
    const [p] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, pedidoId));
    return { cobranca: c.status, forma: c.forma, pagoEm: c.pagoEm, pedido: p.status };
  };

  beforeAll(async () => {
    await garantirTabelasPagamento();
    const [p] = await db
      .insert(schema.pedidos)
      .values({ codigo: `IR-T${sufixo.slice(-5).toUpperCase()}`, clienteNome: "Teste Webhook", clienteTelefone: "(83) 99999-0000", tipoEntrega: "retirada", itens: [], total: 1000 })
      .returning({ id: schema.pedidos.id });
    pedidoId = p.id;
    await db.insert(schema.cobrancas).values({ pedidoId, asaasLinkId: link, url: "https://www.asaas.com/c/teste", valor: 1000 });
  });
  afterAll(async () => {
    await db.delete(schema.pedidos).where(eq(schema.pedidos.id, pedidoId)); // apaga as cobranças junto (cascade)
    if (eventos.length) await db.delete(schema.asaasEventos).where(inArray(schema.asaasEventos.id, eventos));
  });

  it("recusa token errado ou ausente", async () => {
    expect((await enviar(evento("PAYMENT_RECEIVED"), "token-errado")).status).toBe(401);
    expect((await enviar(evento("PAYMENT_RECEIVED"), "")).status).toBe(401);
    expect((await estado()).cobranca).toBe("pendente");
  });

  it("pagamento recebido marca a cobrança como paga e confirma o pedido", async () => {
    const r = await enviar(evento("PAYMENT_RECEIVED"));
    expect(r.status).toBe(200);
    const e = await estado();
    expect(e).toMatchObject({ cobranca: "pago", forma: "PIX", pedido: "confirmado" });
    expect(e.pagoEm).toBeInstanceOf(Date);
  });

  it("o mesmo evento reenviado não é processado de novo", async () => {
    const ev = evento("PAYMENT_REFUNDED");
    await enviar(ev);
    expect((await estado()).cobranca).toBe("estornado");
    await db.update(schema.cobrancas).set({ status: "pago" }).where(eq(schema.cobrancas.asaasLinkId, link));
    const r = await enviar(ev);
    expect(await r.json()).toMatchObject({ repetido: true });
    expect((await estado()).cobranca).toBe("pago");
  });

  it("evento atrasado (vencido) não desfaz o pagamento", async () => {
    await enviar(evento("PAYMENT_OVERDUE"));
    expect((await estado()).cobranca).toBe("pago");
  });

  it("eventos de outros links ou que não interessam respondem 200 sem mudar nada", async () => {
    expect((await enviar(evento("PAYMENT_RECEIVED", { paymentLink: "lnk_que_nao_existe", externalReference: null }))).status).toBe(200);
    expect((await enviar(evento("PAYMENT_CHECKOUT_VIEWED"))).status).toBe(200);
    expect((await estado()).cobranca).toBe("pago");
  });

  it("pedido do checkout (aguardando pagamento) vira confirmado quando o pagamento cai", async () => {
    const [p] = await db
      .insert(schema.pedidos)
      .values({ codigo: `IR-S${sufixo.slice(-5).toUpperCase()}`, status: "pagamento", clienteNome: "Teste Checkout", clienteTelefone: "(83) 99999-0000", tipoEntrega: "retirada", itens: [], total: 500 })
      .returning({ id: schema.pedidos.id });
    const linkSite = `${link}_site`;
    await db.insert(schema.cobrancas).values({ pedidoId: p.id, asaasLinkId: linkSite, url: "https://www.asaas.com/c/teste2", valor: 500 });
    try {
      expect((await enviar(evento("PAYMENT_CONFIRMED", { paymentLink: linkSite, billingType: "CREDIT_CARD" }))).status).toBe(200);
      const [depois] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, p.id));
      expect(depois.status).toBe("confirmado");
    } finally {
      await db.delete(schema.pedidos).where(eq(schema.pedidos.id, p.id));
    }
  });

  it("corpo inválido é recusado", async () => {
    expect((await enviar({ sem: "id" })).status).toBe(400);
  });
});
