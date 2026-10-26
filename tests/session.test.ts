import { afterEach, describe, expect, it, vi } from "vitest";
import { criarToken, validarToken } from "@/lib/session";

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres-123";

afterEach(() => vi.unstubAllEnvs());

describe("sessão do painel (JWT)", () => {
  it("cria e valida o token com o e-mail", async () => {
    vi.stubEnv("AUTH_SECRET", SEGREDO);
    const t = await criarToken("ana@imperio.com");
    expect(await validarToken(t)).toEqual({ email: "ana@imperio.com" });
  });
  it("recusa token adulterado, vazio ou assinado com outro segredo", async () => {
    vi.stubEnv("AUTH_SECRET", SEGREDO);
    const t = await criarToken("ana@imperio.com");
    expect(await validarToken(t.slice(0, -2) + "xx")).toBeNull();
    expect(await validarToken(undefined)).toBeNull();
    expect(await validarToken("lixo")).toBeNull();
    vi.stubEnv("AUTH_SECRET", SEGREDO + "-trocado");
    expect(await validarToken(t)).toBeNull();
  });
  it("não cria token sem AUTH_SECRET ou com segredo curto", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    await expect(criarToken("a@b.com")).rejects.toThrow(/AUTH_SECRET/);
    vi.stubEnv("AUTH_SECRET", "curto");
    await expect(criarToken("a@b.com")).rejects.toThrow(/AUTH_SECRET/);
  });
});
