import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, validarToken } from "@/lib/session";

/** Checagem otimista: sem sessão válida, /admin vai para o login. Cada página/ação revalida no servidor. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const sessao = await validarToken(request.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("de", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
