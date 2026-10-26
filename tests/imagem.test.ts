import { describe, expect, it } from "vitest";
import { tipoImagem } from "@/lib/imagem";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
const texto = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

describe("tipoImagem (upload de fotos do painel)", () => {
  it("reconhece JPEG, PNG e WebP pelos primeiros bytes", () => {
    expect(tipoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ tipo: "image/jpeg", ext: "jpg" });
    expect(tipoImagem(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toEqual({ tipo: "image/png", ext: "png" });
    expect(tipoImagem(bytes(...texto("RIFF"), 0, 0, 0, 0, ...texto("WEBP")))).toEqual({ tipo: "image/webp", ext: "webp" });
  });
  it("recusa outros arquivos, mesmo com nome .jpg", () => {
    expect(tipoImagem(bytes(...texto("%PDF-1.7")))).toBeNull();
    expect(tipoImagem(bytes(...texto("<svg")))).toBeNull();
    expect(tipoImagem(bytes(...texto("RIFF"), 0, 0, 0, 0, ...texto("WAVE")))).toBeNull();
    expect(tipoImagem(new Uint8Array())).toBeNull();
  });
});
