import { describe, expect, it } from "vitest";
import { chaveProduto, interpretarPlanilha, lerSimNao, linhasExportacao, linhasModelo, mapearColunas, MAX_LINHAS } from "@/lib/importacao";
import { lerCsv, paraCsv } from "@/lib/planilha";

describe("mapearColunas", () => {
  it("reconhece o cabeçalho sem acento/caixa e com sinônimos", () => {
    const { mapa, ignoradas } = mapearColunas(["PRODUTO", "Valor", "Preço De", "categoria", "Descrição", "Imagem", "No site", "Destaque", "Estoque"]);
    expect(mapa).toEqual({ nome: 0, preco: 1, precoDe: 2, categoria: 3, descricao: 4, foto: 5, ativo: 6, destaque: 7 });
    expect(ignoradas).toEqual(["Estoque"]);
  });
});

describe("lerSimNao", () => {
  it.each([
    ["Sim", true],
    ["x", true],
    ["1", true],
    ["NÃO", false],
    ["n", false],
    ["0", false],
  ])("%s → %s", (v, esperado) => expect(lerSimNao(v, false)).toBe(esperado));
  it("vazio usa o padrão e texto estranho é inválido", () => {
    expect(lerSimNao("", true)).toBe(true);
    expect(lerSimNao("talvez", true)).toBeNull();
  });
});

describe("interpretarPlanilha", () => {
  it("lê o modelo inteiro sem erros", () => {
    const r = interpretarPlanilha(linhasModelo());
    expect(r.erros).toEqual([]);
    expect(r.produtos[0]).toEqual({
      linha: 2,
      nome: "Buquê 12 rosas vermelhas",
      preco: 18990,
      precoDe: 21990,
      categoria: "Buquês & Ramalhetes",
      descricao: "12 rosas vermelhas com folhagem e papel kraft.",
      ativo: true,
      destaque: true,
    });
    // células vazias não viram campo: não apagam nada de um produto já cadastrado
    expect(r.produtos[1]).toEqual({ linha: 3, nome: "Caixa de bombons", preco: 3990, categoria: "Chocolates", ativo: true, destaque: false });
  });

  it("célula vazia numa coluna existente também não mexe no campo", () => {
    const r = interpretarPlanilha([
      ["Nome", "Preço", "Categoria", "Preço de", "Ativo", "Foto"],
      ["Rosas", "10", "", "", "", ""],
    ]);
    expect(r.produtos).toEqual([{ linha: 2, nome: "Rosas", preco: 1000 }]);
  });

  it("só preenche os campos das colunas que existem (o resto do produto fica como está)", () => {
    const r = interpretarPlanilha([
      ["Nome", "Preço"],
      ["Rosas", "R$ 1.234,50"],
    ]);
    expect(r.produtos).toEqual([{ linha: 2, nome: "Rosas", preco: 123450 }]);
  });

  it("aponta o número da linha como no Excel e importa as linhas boas", () => {
    const r = interpretarPlanilha([
      ["Nome", "Preço", "Foto", "Ativo"],
      ["Rosas", "79,90", "", "sim"],
      ["", "10", "", ""],
      ["Lírios", "abc", "", ""],
      ["Girassol", "50", "foto.jpg", "talvez"],
      ["rosas", "80", "", ""],
    ]);
    expect(r.produtos.map((p) => p.nome)).toEqual(["Rosas"]);
    expect(r.erros).toEqual([
      { linha: 3, mensagem: "nome vazio ou muito curto" },
      { linha: 4, mensagem: "preço vazio ou inválido" },
      { linha: 5, mensagem: "link da foto inválido; “Ativo” deve ser sim ou não" },
      { linha: 6, mensagem: "nome repetido (já aparece na linha 2)" },
    ]);
  });

  it("ignora o “preço de” quando não é maior que o preço", () => {
    const r = interpretarPlanilha([
      ["Nome", "Preço", "Preço de"],
      ["Rosas", "100", "90"],
    ]);
    expect(r.produtos[0].precoDe).toBeNull();
  });

  it("explica quando faltam colunas obrigatórias, a planilha está vazia ou é grande demais", () => {
    expect(interpretarPlanilha([["Produto", "Categoria"], ["Rosas", "Buquês"]]).erros[0].mensagem).toMatch(/Preço/);
    expect(interpretarPlanilha([["Nome", "Preço"]]).erros[0].mensagem).toMatch(/vazia/);
    const grande = [["Nome", "Preço"], ...Array.from({ length: MAX_LINHAS + 1 }, (_, i) => [`P${i}`, "1"])];
    expect(interpretarPlanilha(grande).erros[0].mensagem).toMatch(/Máximo/);
  });
});

describe("exportar e importar de volta", () => {
  it("o catálogo baixado em CSV volta igual na importação", () => {
    const atuais = [
      { nome: "Buquê; especial", preco: 18990, precoDe: 21990, categoria: "Buquês", descricao: 'Com "cartão"', foto: "https://fotos.imperiodasrosas.com/p/a.jpg", ativo: true, destaque: false },
      { nome: "Pelúcia", preco: 5990, precoDe: null, categoria: null, descricao: null, foto: null, ativo: false, destaque: true },
    ];
    const r = interpretarPlanilha(lerCsv(paraCsv(linhasExportacao(atuais))));
    expect(r.erros).toEqual([]);
    expect(r.produtos).toEqual([
      { linha: 2, nome: "Buquê; especial", preco: 18990, precoDe: 21990, categoria: "Buquês", descricao: 'Com "cartão"', foto: "https://fotos.imperiodasrosas.com/p/a.jpg", ativo: true, destaque: false },
      { linha: 3, nome: "Pelúcia", preco: 5990, ativo: false, destaque: true },
    ]);
  });
  it("casa produtos pelo nome sem acento, caixa ou espaços extras", () => {
    expect(chaveProduto("  Buquê  de ROSAS ")).toBe(chaveProduto("buque de rosas"));
  });
});
