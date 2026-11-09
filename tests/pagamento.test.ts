import { describe, expect, it } from "vitest";
import { corpoLinkPagamento, mensagemCobranca, pedidoDaReferencia, podeMudarStatus, rotuloForma, statusPorEvento, tokenConfere } from "@/lib/pagamento";

describe("statusPorEvento", () => {
  it.each([
    ["PAYMENT_RECEIVED", "pago"],
    ["PAYMENT_CONFIRMED", "pago"],
    ["PAYMENT_OVERDUE", "vencido"],
    ["PAYMENT_REFUNDED", "estornado"],
    ["PAYMENT_CHARGEBACK_REQUESTED", "estornado"],
    ["PAYMENT_DELETED", "cancelado"],
  ])("%s → %s", (evento, status) => expect(statusPorEvento(evento)).toBe(status));
  it("ignora eventos que não mudam a cobrança", () => {
    for (const e of ["PAYMENT_CREATED", "PAYMENT_UPDATED", "PAYMENT_CHECKOUT_VIEWED", "PAYMENT_BANK_SLIP_VIEWED", "QUALQUER_COISA"]) expect(statusPorEvento(e)).toBeNull();
  });
});

describe("podeMudarStatus", () => {
  it("evento atrasado não desfaz um pagamento", () => {
    expect(podeMudarStatus("pago", "vencido")).toBe(false);
    expect(podeMudarStatus("pago", "cancelado")).toBe(false);
    expect(podeMudarStatus("pago", "pago")).toBe(false);
  });
  it("pagamento pode ser estornado; estornado é final", () => {
    expect(podeMudarStatus("pago", "estornado")).toBe(true);
    expect(podeMudarStatus("estornado", "pago")).toBe(false);
  });
  it("pendente e vencido podem virar pago", () => {
    expect(podeMudarStatus("pendente", "pago")).toBe(true);
    expect(podeMudarStatus("vencido", "pago")).toBe(true);
  });
});

describe("tokenConfere", () => {
  const token = "t".repeat(20) + "ImperioRosas2026!x";
  it("aceita o token certo e recusa o resto", () => {
    expect(tokenConfere(token, token)).toBe(true);
    expect(tokenConfere(token + "a", token)).toBe(false);
    expect(tokenConfere(token.slice(0, -1) + "y", token)).toBe(false);
    expect(tokenConfere(null, token)).toBe(false);
    expect(tokenConfere("", token)).toBe(false);
  });
  it("sem token configurado (ou curto demais) ninguém passa", () => {
    expect(tokenConfere("qualquer", undefined)).toBe(false);
    expect(tokenConfere("curto", "curto")).toBe(false);
  });
});

describe("corpoLinkPagamento", () => {
  const pedido = { id: 42, codigo: "IR-ABC234", clienteNome: "Maria Silva", total: 18990, itens: [{ qtd: 2, nome: "Buquê" }, { qtd: 1, nome: "Pelúcia" }] };
  it("cobra produtos + entrega em reais, valor fixo, cliente escolhe a forma", () => {
    const c = corpoLinkPagamento(pedido, 1500, "https://imperiodasrosas.com/");
    expect(c.value).toBe(204.9);
    expect(c.billingType).toBe("UNDEFINED");
    expect(c.chargeType).toBe("DETACHED");
    expect(c.externalReference).toBe("pedido:42");
    expect(c.name).toContain("IR-ABC234");
    expect(c.description).toBe("2x Buquê, 1x Pelúcia + entrega — Maria Silva");
    expect(c.callback).toEqual({ successUrl: "https://imperiodasrosas.com/pedido/IR-ABC234?pago=1", autoRedirect: true });
  });
  it("sem taxa não fala de entrega e evita erro de arredondamento", () => {
    const c = corpoLinkPagamento({ ...pedido, total: 1990 + 7990 + 10 }, 0, "https://x.com");
    expect(c.value).toBe(99.9);
    expect(c.description).not.toContain("entrega");
  });
});

describe("auxiliares", () => {
  it("pedidoDaReferencia", () => {
    expect(pedidoDaReferencia("pedido:123")).toBe(123);
    expect(pedidoDaReferencia("outra:123")).toBeNull();
    expect(pedidoDaReferencia(null)).toBeNull();
  });
  it("rotuloForma", () => {
    expect(rotuloForma("PIX")).toBe("Pix");
    expect(rotuloForma("CREDIT_CARD")).toBe("Cartão de crédito");
    expect(rotuloForma(null)).toBe("");
  });
  it("mensagemCobranca usa o primeiro nome, o código, o valor e o link", () => {
    const m = mensagemCobranca(" Maria Silva ", "IR-ABC234", "R$ 204,90", "https://www.asaas.com/c/1");
    expect(m).toMatch(/^Olá, Maria!/);
    expect(m).toContain("*IR-ABC234* (R$ 204,90)");
    expect(m).toContain("https://www.asaas.com/c/1");
  });
});
