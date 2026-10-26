import { describe, expect, it } from "vitest";
import { linkWhatsApp, mensagemPedido } from "@/lib/whatsapp";

const base = {
  codigo: "IR-ABC234",
  clienteNome: "Maria",
  clienteTelefone: "(83) 99999-0000",
  tipoEntrega: "entrega" as const,
  endereco: "Rua das Flores, 10",
  bairro: "Manaíra",
  dataEntrega: "2026-10-30",
  periodo: "Tarde (12h às 18h)",
  destinatario: null,
  mensagemCartao: null,
  observacoes: null,
  itens: [
    { produtoId: 1, nome: "4 rosas vermelhas", preco: 7990, qtd: 2 },
    { produtoId: 2, nome: "Box girassóis", preco: 34990, qtd: 1 },
  ],
  total: 50970,
};

describe("linkWhatsApp", () => {
  it("sem mensagem usa o wa.me", () => {
    expect(linkWhatsApp("5583996571070")).toBe("https://wa.me/5583996571070");
  });
  it("com mensagem vai direto para api.whatsapp.com (o wa.me estraga emojis)", () => {
    const url = new URL(linkWhatsApp("5583996571070", "Olá 🌹 tudo bem?"));
    expect(url.origin).toBe("https://api.whatsapp.com");
    expect(url.searchParams.get("phone")).toBe("5583996571070");
    expect(url.searchParams.get("text")).toBe("Olá 🌹 tudo bem?");
  });
});

describe("mensagemPedido", () => {
  it("lista itens, total, cliente e entrega", () => {
    const m = mensagemPedido(base).replace(/\s/g, " ");
    expect(m).toContain("*Novo pedido IR-ABC234*");
    expect(m).toContain("• 2x 4 rosas vermelhas — R$ 159,80");
    expect(m).toContain("• 1x Box girassóis — R$ 349,90");
    expect(m).toContain("*Total dos produtos:* R$ 509,70");
    expect(m).toContain("_Taxa de entrega a confirmar_");
    expect(m).toContain("*Entrega:* Rua das Flores, 10 – Manaíra");
    expect(m).toContain("*Data:* 30/10/2026 (Tarde (12h às 18h))");
  });
  it("na retirada não fala de taxa nem de endereço", () => {
    const m = mensagemPedido({ ...base, tipoEntrega: "retirada", endereco: null, bairro: null });
    expect(m).toContain("*Retirada na loja*");
    expect(m).not.toContain("Taxa de entrega");
    expect(m).not.toContain("*Entrega:*");
  });
  it("inclui cartão, destinatário e observações só quando preenchidos", () => {
    const vazio = mensagemPedido(base);
    expect(vazio).not.toContain("*Cartão:*");
    expect(vazio).not.toContain("*Para:*");
    const cheio = mensagemPedido({ ...base, destinatario: "Ana", mensagemCartao: "Te amo", observacoes: "Ligar antes" });
    expect(cheio).toContain('*Cartão:* "Te amo"');
    expect(cheio).toContain("*Para:* Ana");
    expect(cheio).toContain("*Obs.:* Ligar antes");
  });
  it("não deixa linhas em branco repetidas nem sobrando no fim", () => {
    const m = mensagemPedido({ ...base, tipoEntrega: "retirada", endereco: null, bairro: null, dataEntrega: null, periodo: null });
    expect(m).not.toMatch(/\n\n\n/);
    expect(m).toBe(m.trim());
  });
});
