import { describe, expect, it } from "vitest";
import { CONTEUDO_PADRAO, LOJA_PADRAO, conteudoSchema, lojaSchema } from "@/lib/config-types";
import { ROTULO_STATUS, STATUS_PEDIDO } from "@/lib/status";

describe("configurações da loja", () => {
  it("os valores padrão passam na validação", () => {
    expect(lojaSchema.safeParse(LOJA_PADRAO).success).toBe(true);
    expect(conteudoSchema.safeParse(CONTEUDO_PADRAO).success).toBe(true);
  });
  it("WhatsApp precisa ser 55 + DDD + número, só dígitos", () => {
    expect(lojaSchema.safeParse({ ...LOJA_PADRAO, whatsapp: "83996571070" }).success).toBe(false);
    expect(lojaSchema.safeParse({ ...LOJA_PADRAO, whatsapp: "+55 83 99657-1070" }).success).toBe(false);
    expect(lojaSchema.safeParse({ ...LOJA_PADRAO, whatsapp: "558332221234" }).success).toBe(true);
  });
  it("pedido mínimo não pode ser negativo", () => {
    expect(lojaSchema.safeParse({ ...LOJA_PADRAO, pedidoMinimoCentavos: -1 }).success).toBe(false);
  });
});

describe("status dos pedidos", () => {
  it("todo status tem um rótulo", () => {
    for (const s of STATUS_PEDIDO) expect(ROTULO_STATUS[s]).toBeTruthy();
    expect(Object.keys(ROTULO_STATUS)).toHaveLength(STATUS_PEDIDO.length);
  });
});
