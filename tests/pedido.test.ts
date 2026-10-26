import { describe, expect, it } from "vitest";
import { entradaPedidoSchema, errosPorCampo, hojeRecife, montarItens, novoCodigo, type EntradaPedido } from "@/lib/pedido";

const valido: EntradaPedido = {
  itens: [{ id: 1, qtd: 1 }],
  clienteNome: "Maria Silva",
  clienteTelefone: "(83) 99999-0000",
  tipoEntrega: "entrega",
  endereco: "Rua das Flores, 10",
  bairro: "Manaíra",
  dataEntrega: "2026-10-30",
  periodo: "Manhã (8h às 12h)",
  site: "",
};

function erros(d: EntradaPedido) {
  const r = entradaPedidoSchema.safeParse(d);
  return r.success ? {} : errosPorCampo(r.error.issues);
}

describe("validação do checkout", () => {
  it("aceita um pedido completo de entrega", () => {
    expect(entradaPedidoSchema.safeParse(valido).success).toBe(true);
  });
  it("aceita retirada sem endereço e bairro", () => {
    expect(entradaPedidoSchema.safeParse({ ...valido, tipoEntrega: "retirada", endereco: undefined, bairro: undefined }).success).toBe(true);
  });
  it("exige endereço e bairro na entrega", () => {
    const e = erros({ ...valido, endereco: "", bairro: "" });
    expect(e.endereco).toBe("Informe o endereço de entrega");
    expect(e.bairro).toBe("Informe o bairro");
  });
  it("exige nome, telefone com DDD e data", () => {
    const e = erros({ ...valido, clienteNome: "A", clienteTelefone: "9999-0000", dataEntrega: "30/10/2026" });
    expect(e.clienteNome).toBe("Informe seu nome");
    expect(e.clienteTelefone).toBe("Telefone com DDD");
    expect(e.dataEntrega).toBe("Escolha a data");
  });
  it("recusa carrinho vazio e quantidades fora do limite", () => {
    expect(erros({ ...valido, itens: [] }).itens).toBe("Carrinho vazio");
    expect(entradaPedidoSchema.safeParse({ ...valido, itens: [{ id: 1, qtd: 0 }] }).success).toBe(false);
    expect(entradaPedidoSchema.safeParse({ ...valido, itens: [{ id: 1, qtd: 100 }] }).success).toBe(false);
  });
  it("bloqueia robôs que preenchem o campo escondido (honeypot)", () => {
    expect(entradaPedidoSchema.safeParse({ ...valido, site: "http://spam" }).success).toBe(false);
  });
});

describe("montarItens", () => {
  const produtos = [
    { id: 1, nome: "4 rosas vermelhas", preco: 7990, foto: null },
    { id: 2, nome: "Box girassóis", preco: 34990, foto: "https://fotos.imperiodasrosas.com/produtos/box.jpg" },
  ];
  it("usa o preço do banco e soma o total", () => {
    const r = montarItens([{ id: 1, qtd: 2 }, { id: 2, qtd: 1 }], produtos);
    expect(r.total).toBe(7990 * 2 + 34990);
    expect(r.itens).toEqual([
      { produtoId: 1, nome: "4 rosas vermelhas", preco: 7990, qtd: 2, foto: null },
      { produtoId: 2, nome: "Box girassóis", preco: 34990, qtd: 1, foto: "https://fotos.imperiodasrosas.com/produtos/box.jpg" },
    ]);
  });
  it("ignora produtos que não existem mais ou foram desativados", () => {
    const r = montarItens([{ id: 1, qtd: 1 }, { id: 99, qtd: 5 }], produtos);
    expect(r.itens).toHaveLength(1);
    expect(r.total).toBe(7990);
  });
  it("carrinho só com produtos indisponíveis fica vazio e com total zero", () => {
    expect(montarItens([{ id: 99, qtd: 1 }], produtos)).toEqual({ itens: [], total: 0 });
  });
});

describe("novoCodigo", () => {
  it("tem o formato IR- + 6 caracteres sem 0, O, 1 e I", () => {
    for (let i = 0; i < 200; i++) expect(novoCodigo()).toMatch(/^IR-[A-HJ-NP-Z2-9]{6}$/);
  });
  it("é determinístico para os mesmos bytes", () => {
    expect(novoCodigo(new Uint8Array([0, 1, 2, 3, 4, 5]))).toBe("IR-ABCDEF");
  });
});

describe("hojeRecife", () => {
  it("usa o fuso de João Pessoa (UTC-3)", () => {
    // 02:00 UTC do dia 27 ainda é dia 26 em João Pessoa
    expect(hojeRecife(new Date("2026-10-27T02:00:00Z"))).toBe("2026-10-26");
    expect(hojeRecife(new Date("2026-10-27T03:00:00Z"))).toBe("2026-10-27");
  });
});
