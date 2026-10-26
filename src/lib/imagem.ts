/** Tipo real da imagem pelos primeiros bytes (o navegador manda JPEG; PNG/WebP só se a redução falhar). */
export function tipoImagem(b: Uint8Array): { tipo: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { tipo: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { tipo: "image/png", ext: "png" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { tipo: "image/webp", ext: "webp" };
  return null;
}
