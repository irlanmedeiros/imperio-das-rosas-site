import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, validarToken } from "./session";

/** Garante sessão de admin em páginas e Server Actions do painel. */
export async function exigirAdmin() {
  const store = await cookies();
  const sessao = await validarToken(store.get(COOKIE_SESSAO)?.value);
  if (!sessao) redirect("/admin/login");
  return sessao;
}
