import bcrypt from "bcryptjs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { autenticar, gerarHash, novoUsuarioSchema, normalizarEmail, podeRemover, resolverSessao, senhaSchema, type UsuarioSessao } from "@/lib/usuarios";

// custo baixo só para os testes ficarem rápidos (a comparação funciona igual)
let hashDono: string;
let hashAna: string;
beforeAll(async () => {
  hashDono = await bcrypt.hash("SenhaDono1", 4);
  hashAna = await bcrypt.hash("SenhaAna1", 4);
});

const principal = () => ({ email: "Dono@Imperio.com", hash: hashDono });
const banco = () =>
  vi.fn(async (email: string) => (email === "ana@imperio.com" ? { nome: "Ana", email: "ana@imperio.com", senhaHash: hashAna, papel: "equipe" as const } : null));

describe("normalizarEmail", () => {
  it("tira espaços e deixa minúsculo", () => {
    expect(normalizarEmail("  Ana@Imperio.COM ")).toBe("ana@imperio.com");
  });
});

describe("regras de senha e cadastro", () => {
  it("exige 8+ caracteres com letras e números", () => {
    expect(senhaSchema.safeParse("abc12345").success).toBe(true);
    expect(senhaSchema.safeParse("abc123").success).toBe(false);
    expect(senhaSchema.safeParse("abcdefgh").success).toBe(false);
    expect(senhaSchema.safeParse("12345678").success).toBe(false);
    expect(senhaSchema.safeParse("a1".repeat(37)).success).toBe(false); // > 72 (limite do bcrypt)
  });
  it("valida e normaliza o novo usuário", () => {
    const r = novoUsuarioSchema.safeParse({ nome: " Ana ", email: " ANA@Imperio.com ", senha: "Senha123", papel: "equipe" });
    expect(r.success && r.data).toEqual({ nome: "Ana", email: "ana@imperio.com", senha: "Senha123", papel: "equipe" });
  });
  it("recusa e-mail inválido, nome curto e papel desconhecido", () => {
    expect(novoUsuarioSchema.safeParse({ nome: "Ana", email: "ana", senha: "Senha123", papel: "equipe" }).success).toBe(false);
    expect(novoUsuarioSchema.safeParse({ nome: "A", email: "a@b.com", senha: "Senha123", papel: "equipe" }).success).toBe(false);
    expect(novoUsuarioSchema.safeParse({ nome: "Ana", email: "a@b.com", senha: "Senha123", papel: "admin" }).success).toBe(false);
  });
  it("gerarHash produz um hash bcrypt que confere com a senha", async () => {
    const h = await gerarHash("Senha123");
    expect(h).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare("Senha123", h)).toBe(true);
  });
});

describe("autenticar", () => {
  it("entra com a conta principal (e-mail sem diferenciar maiúsculas)", async () => {
    const buscar = banco();
    expect(await autenticar("dono@imperio.com", "SenhaDono1", principal(), buscar)).toEqual({ email: "dono@imperio.com", nome: "Dono", papel: "dono", principal: true });
    expect(buscar).not.toHaveBeenCalled();
  });
  it("recusa a conta principal com senha errada, sem cair para o banco", async () => {
    const buscar = banco();
    expect(await autenticar("dono@imperio.com", "errada", principal(), buscar)).toBeNull();
    expect(buscar).not.toHaveBeenCalled();
  });
  it("entra com um usuário do banco", async () => {
    expect(await autenticar(" Ana@Imperio.com", "SenhaAna1", principal(), banco())).toEqual({ email: "ana@imperio.com", nome: "Ana", papel: "equipe", principal: false });
  });
  it("recusa usuário do banco com senha errada, e-mail desconhecido ou campos vazios", async () => {
    expect(await autenticar("ana@imperio.com", "SenhaDono1", principal(), banco())).toBeNull();
    expect(await autenticar("ninguem@imperio.com", "SenhaAna1", principal(), banco())).toBeNull();
    expect(await autenticar("", "x", principal(), banco())).toBeNull();
    expect(await autenticar("ana@imperio.com", "", principal(), banco())).toBeNull();
  });
  it("sem conta principal configurada, só usuários do banco entram", async () => {
    expect(await autenticar("dono@imperio.com", "SenhaDono1", {}, banco())).toBeNull();
    expect(await autenticar("ana@imperio.com", "SenhaAna1", {}, banco())).not.toBeNull();
  });
});

describe("resolverSessao", () => {
  it("reconhece a conta principal e os usuários do banco", async () => {
    expect((await resolverSessao("DONO@imperio.com", "dono@imperio.com", banco()))?.papel).toBe("dono");
    expect((await resolverSessao("ana@imperio.com", "dono@imperio.com", banco()))?.nome).toBe("Ana");
  });
  it("usuário removido perde a sessão na hora", async () => {
    expect(await resolverSessao("removido@imperio.com", "dono@imperio.com", banco())).toBeNull();
  });
});

describe("podeRemover", () => {
  const dono: UsuarioSessao = { email: "dono@imperio.com", nome: "Dono", papel: "dono", principal: true };
  const equipe: UsuarioSessao = { email: "ana@imperio.com", nome: "Ana", papel: "equipe", principal: false };
  it("o dono remove outras pessoas", () => {
    expect(podeRemover("ana@imperio.com", dono)).toEqual({ ok: true });
  });
  it("ninguém remove a si mesmo", () => {
    expect(podeRemover("DONO@imperio.com", dono).ok).toBe(false);
  });
  it("equipe não remove ninguém", () => {
    expect(podeRemover("outro@imperio.com", equipe)).toEqual({ ok: false, erro: "Só o dono pode remover usuários." });
  });
});
