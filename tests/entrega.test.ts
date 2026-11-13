import { describe, expect, it } from "vitest";
import { lerTaxas, taxaEntrega, taxasEmTexto } from "@/lib/entrega";

const taxas = [
  { bairro: "Manaíra", valor: 1000 },
  { bairro: "Cabo Branco", valor: 1250 },
];

describe("taxaEntrega", () => {
  it("retirada não paga entrega", () => {
    expect(taxaEntrega("retirada", "", taxas, null)).toBe(0);
  });
  it("acha o bairro sem ligar para acento, caixa e espaços", () => {
    expect(taxaEntrega("entrega", "manaira", taxas, null)).toBe(1000);
    expect(taxaEntrega("entrega", "  CABO  branco ", taxas, null)).toBe(1250);
  });
  it("bairro fora da lista usa a taxa dos outros bairros, ou null (combinar no WhatsApp)", () => {
    expect(taxaEntrega("entrega", "Bessa", taxas, 1500)).toBe(1500);
    expect(taxaEntrega("entrega", "Bessa", taxas, null)).toBeNull();
    expect(taxaEntrega("entrega", "", taxas, 1500)).toBeNull();
  });
});

describe("lerTaxas", () => {
  it("entende vários jeitos de escrever", () => {
    const r = lerTaxas("Manaíra 10\nBessa - 12,50\nCentro; R$ 8,00\nTambaú: 9.5\n\nAltiplano\tR$15");
    expect(r.erros).toEqual([]);
    expect(r.taxas).toEqual([
      { bairro: "Manaíra", valor: 1000 },
      { bairro: "Bessa", valor: 1250 },
      { bairro: "Centro", valor: 800 },
      { bairro: "Tambaú", valor: 950 },
      { bairro: "Altiplano", valor: 1500 },
    ]);
  });
  it("aponta as linhas sem valor e não repete bairro (vale a última)", () => {
    const r = lerTaxas("Mangabeira\nBessa 10\nbessa 12");
    expect(r.erros).toEqual(["Mangabeira"]);
    expect(r.taxas).toEqual([{ bairro: "bessa", valor: 1200 }]);
  });
  it("volta para texto e é lido igual", () => {
    expect(lerTaxas(taxasEmTexto(taxas)).taxas).toEqual(taxas);
  });
});
