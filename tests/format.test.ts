import { describe, expect, it } from "vitest";
import { brl, centavosParaInput, dataBR, formatarTelefone, normalizar, parsePreco, slugify, soDigitos } from "@/lib/format";

// Intl usa espaço não separável depois do "R$"
const sp = (s: string) => s.replace(/\s/g, " ");

describe("brl", () => {
  it("formata centavos em reais", () => {
    expect(sp(brl(7990))).toBe("R$ 79,90");
    expect(sp(brl(123456))).toBe("R$ 1.234,56");
    expect(sp(brl(0))).toBe("R$ 0,00");
  });
});

describe("parsePreco", () => {
  it.each([
    ["79,90", 7990],
    ["R$ 1.234,56", 123456],
    ["1234.56", 123456],
    ["10", 1000],
    ["0,5", 50],
  ])("%s → %i centavos", (entrada, esperado) => {
    expect(parsePreco(entrada)).toBe(esperado);
  });
  it("devolve null para texto vazio ou sem número", () => {
    expect(parsePreco("")).toBeNull();
    expect(parsePreco("abc")).toBeNull();
  });
  it("faz o caminho de volta com centavosParaInput", () => {
    expect(centavosParaInput(7990)).toBe("79,90");
    expect(parsePreco(centavosParaInput(123456))).toBe(123456);
    expect(centavosParaInput(null)).toBe("");
  });
});

describe("slugify / normalizar", () => {
  it("gera slugs sem acento e sem símbolos", () => {
    expect(slugify("Buquê de Lírios & Rosas!")).toBe("buque-de-lirios-rosas");
    expect(slugify("  Box   Girassóis  ")).toBe("box-girassois");
    expect(slugify("***")).toBe("");
  });
  it("normaliza para busca sem acento e caixa", () => {
    expect(normalizar("Pelúcia ÁGUA")).toBe("pelucia agua");
  });
});

describe("telefone", () => {
  it("extrai só os dígitos", () => {
    expect(soDigitos("(83) 99657-1070")).toBe("83996571070");
  });
  it("formata celular, fixo e número com 55", () => {
    expect(formatarTelefone("83996571070")).toBe("(83) 99657-1070");
    expect(formatarTelefone("8332221234")).toBe("(83) 3222-1234");
    expect(formatarTelefone("5583996571070")).toBe("(83) 99657-1070");
  });
  it("deixa como está o que não reconhece", () => {
    expect(formatarTelefone("123")).toBe("123");
  });
});

describe("dataBR", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA", () => {
    expect(dataBR("2026-10-26")).toBe("26/10/2026");
  });
  it("lida com vazio e formatos estranhos", () => {
    expect(dataBR(null)).toBe("");
    expect(dataBR("")).toBe("");
    expect(dataBR("amanhã")).toBe("amanhã");
  });
});
