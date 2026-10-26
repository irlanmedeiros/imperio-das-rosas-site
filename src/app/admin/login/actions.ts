"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buscarUsuario } from "@/lib/auth";
import { COOKIE_SESSAO, criarToken, opcoesCookie } from "@/lib/session";
import { autenticar } from "@/lib/usuarios";

export type EstadoLogin = { erro?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "");
  const senha = String(form.get("senha") ?? "");
  const destino = String(form.get("de") ?? "");
  const usuario = await autenticar(email, senha, { email: process.env.ADMIN_EMAIL, hash: process.env.ADMIN_PASSWORD_HASH }, buscarUsuario);
  if (!usuario) {
    await new Promise((r) => setTimeout(r, 600));
    return { erro: "E-mail ou senha incorretos." };
  }
  const store = await cookies();
  store.set(COOKIE_SESSAO, await criarToken(usuario.email), opcoesCookie);
  redirect(destino.startsWith("/admin") ? destino : "/admin");
}

export async function sair() {
  const store = await cookies();
  store.delete(COOKIE_SESSAO);
  redirect("/admin/login");
}
