import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { COOKIE_SESSAO, validarToken } from "./session";
import { resolverSessao, type UsuarioSessao } from "./usuarios";

/** Usuário do banco pelo e-mail (já normalizado). */
export async function buscarUsuario(email: string) {
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email)).limit(1);
  return u ?? null;
}

/** Garante sessão válida em páginas e Server Actions do painel e devolve quem está logado. */
export async function exigirAdmin(): Promise<UsuarioSessao> {
  const store = await cookies();
  const token = await validarToken(store.get(COOKIE_SESSAO)?.value);
  const sessao = token && (await resolverSessao(token.email, process.env.ADMIN_EMAIL, buscarUsuario));
  if (!sessao) redirect("/admin/login");
  return sessao;
}

/** Como exigirAdmin, mas só para o papel "dono" (aba Usuários). */
export async function exigirDono(): Promise<UsuarioSessao> {
  const sessao = await exigirAdmin();
  if (sessao.papel !== "dono") redirect("/admin");
  return sessao;
}
