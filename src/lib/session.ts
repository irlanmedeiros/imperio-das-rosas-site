import { jwtVerify, SignJWT } from "jose";

export const COOKIE_SESSAO = "ir_admin";
const DURACAO_S = 60 * 60 * 24 * 7; // 7 dias

function chave() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ausente ou curto (mín. 32 caracteres)");
  return new TextEncoder().encode(s);
}

export async function criarToken(email: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_S}s`)
    .sign(chave());
}

export async function validarToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return typeof payload.email === "string" ? { email: payload.email } : null;
  } catch {
    return null;
  }
}

export const opcoesCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACAO_S,
};
