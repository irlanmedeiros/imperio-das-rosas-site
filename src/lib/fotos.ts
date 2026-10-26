import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { slugify } from "./format";
import { tipoImagem } from "./imagem";

export const MAX_FOTO_BYTES = 4 * 1024 * 1024;

/** Hosts cujas fotos o site já exibe direto (next.config → images.remotePatterns). */
export function fotoJaHospedada(url: string) {
  try {
    const h = new URL(url).hostname;
    return h === "fotos.imperiodasrosas.com" || h.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Guarda a imagem no R2 (bucket FOTOS) e devolve a URL pública. Recusa o que não for JPG/PNG/WebP. */
export async function guardarFoto(bytes: Uint8Array, pasta: string, nomeBase: string): Promise<string> {
  const formato = tipoImagem(bytes);
  if (!formato) throw new Error("Use uma foto em JPG, PNG ou WebP.");
  const chave = `${pasta}/${slugify(nomeBase) || "foto"}-${crypto.randomUUID().slice(0, 8)}.${formato.ext}`;
  const { env } = await getCloudflareContext({ async: true });
  await env.FOTOS.put(chave, bytes, {
    httpMetadata: { contentType: formato.tipo, cacheControl: "public, max-age=31536000, immutable" },
  });
  return `${process.env.FOTOS_URL_BASE}/${chave}`;
}

/** Baixa uma foto de um link (planilha) e guarda no R2. */
export async function copiarFotoDeLink(url: string, nomeBase: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow" });
  if (!r.ok) throw new Error(`o link respondeu ${r.status}`);
  const tamanho = Number(r.headers.get("content-length") ?? 0);
  if (tamanho > MAX_FOTO_BYTES) throw new Error("foto maior que 4 MB");
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.byteLength > MAX_FOTO_BYTES) throw new Error("foto maior que 4 MB");
  if (!tipoImagem(bytes)) throw new Error("o link não é uma imagem JPG, PNG ou WebP (links de pasta do Google Drive/Instagram não funcionam)");
  return guardarFoto(bytes, "produtos", nomeBase);
}
