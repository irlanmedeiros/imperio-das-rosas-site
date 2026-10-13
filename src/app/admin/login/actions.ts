"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, criarToken, opcoesCookie } from "@/lib/session";

export type EstadoLogin = { erro?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const destino = String(form.get("de") ?? "");
  const emailOk = email === (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  // compara a senha mesmo com e-mail errado, para não revelar qual dos dois falhou
  const senhaOk = await bcrypt.compare(senha, process.env.ADMIN_PASSWORD_HASH ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!emailOk || !senhaOk) {
    await new Promise((r) => setTimeout(r, 600));
    return { erro: "E-mail ou senha incorretos." };
  }
  const store = await cookies();
  store.set(COOKIE_SESSAO, await criarToken(email), opcoesCookie);
  redirect(destino.startsWith("/admin") ? destino : "/admin");
}

export async function sair() {
  const store = await cookies();
  store.delete(COOKIE_SESSAO);
  redirect("/admin/login");
}
