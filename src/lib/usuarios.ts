import bcrypt from "bcryptjs";
import { z } from "zod";

/** dono: tudo, inclusive a aba Usuários. equipe: todo o painel menos Usuários. */
export const PAPEIS = ["dono", "equipe"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = { dono: "Dono", equipe: "Equipe" };

/** Quem está logado no painel. `principal` é a conta das variáveis ADMIN_EMAIL/ADMIN_PASSWORD_HASH. */
export type UsuarioSessao = { email: string; nome: string; papel: Papel; principal: boolean };

/** Hash inválido usado para comparar a senha mesmo quando o e-mail não existe (mesmo tempo de resposta). */
const HASH_FALSO = "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
export const CUSTO_BCRYPT = 12;

export function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export const senhaSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres")
  .max(72, "Senha longa demais (máx. 72 caracteres)") // limite do bcrypt
  .refine((s) => /[a-zA-Z]/.test(s) && /\d/.test(s), "Use letras e números na senha");

export const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(120),
  senha: senhaSchema,
  papel: z.enum(PAPEIS),
});
export type NovoUsuario = z.input<typeof novoUsuarioSchema>;

export function gerarHash(senha: string) {
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

type ContaPrincipal = { email?: string; hash?: string };
type BuscarUsuario = (email: string) => Promise<{ nome: string; email: string; senhaHash: string; papel: Papel } | null | undefined>;

/**
 * Confere e-mail e senha: primeiro a conta principal (variáveis de ambiente), depois os usuários do banco.
 * Sempre roda um bcrypt.compare, para não revelar pelo tempo de resposta se o e-mail existe.
 */
export async function autenticar(emailDigitado: string, senha: string, principal: ContaPrincipal, buscar: BuscarUsuario): Promise<UsuarioSessao | null> {
  const email = normalizarEmail(emailDigitado);
  if (!email || !senha) return null;

  if (principal.email && email === normalizarEmail(principal.email)) {
    const ok = await bcrypt.compare(senha, principal.hash || HASH_FALSO);
    return ok ? { email, nome: "Dono", papel: "dono", principal: true } : null;
  }

  const u = await buscar(email);
  const ok = await bcrypt.compare(senha, u?.senhaHash || HASH_FALSO);
  return u && ok ? { email: u.email, nome: u.nome, papel: u.papel, principal: false } : null;
}

/**
 * Confere de novo, a cada página do painel, quem é o dono do token: um usuário removido
 * (ou que virou "equipe") perde o acesso na hora, sem esperar o cookie expirar.
 */
export async function resolverSessao(emailDoToken: string, principalEmail: string | undefined, buscar: BuscarUsuario): Promise<UsuarioSessao | null> {
  const email = normalizarEmail(emailDoToken);
  if (principalEmail && email === normalizarEmail(principalEmail)) return { email, nome: "Dono", papel: "dono", principal: true };
  const u = await buscar(email);
  return u ? { email: u.email, nome: u.nome, papel: u.papel, principal: false } : null;
}

/** Regras para remover um usuário (a conta principal não está no banco e nunca é removida por aqui). */
export function podeRemover(alvoEmail: string, quemRemove: UsuarioSessao): { ok: true } | { ok: false; erro: string } {
  if (normalizarEmail(alvoEmail) === quemRemove.email) return { ok: false, erro: "Você não pode remover o próprio usuário." };
  if (quemRemove.papel !== "dono") return { ok: false, erro: "Só o dono pode remover usuários." };
  return { ok: true };
}
