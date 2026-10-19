"use client";

import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { enviarImagem } from "@/app/admin/actions";

/** Reduz a foto no navegador antes de enviar (máx. 1600px, JPEG); o servidor só guarda no R2. */
async function reduzir(arquivo: File, maximo = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("falha ao converter"))), "image/jpeg", 0.85));
}

export function UploadImagem({
  valor,
  onChange,
  pasta = "produtos",
  largo = false,
  removivel = true,
}: {
  valor: string | null;
  onChange: (url: string | null) => void;
  pasta?: string;
  largo?: boolean;
  removivel?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return setErro("Escolha um arquivo de imagem.");
    setErro(null);
    setEnviando(true);
    try {
      const form = new FormData();
      const reduzida = await reduzir(arquivo).catch(() => arquivo);
      form.append("arquivo", new File([reduzida], arquivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
      form.append("pasta", pasta);
      const r = await enviarImagem(form);
      if (r.ok) onChange(r.url);
      else setErro(r.erro);
    } catch {
      setErro("Falha no envio. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div
        className={`upload${largo ? " largo" : ""}${arrastando ? " arrastando" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => !valor && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          enviar(e.dataTransfer.files[0]);
        }}
        aria-label="Enviar imagem"
      >
        {valor ? (
          <>
            <Image src={valor} alt="" fill sizes="400px" />
            <div className="upload-acoes">
              <button type="button" className="btn btn-light btn-sm" onClick={(e) => (e.stopPropagation(), input.current?.click())}>
                <Upload /> Trocar
              </button>
              {removivel && (
                <button type="button" className="btn btn-light btn-sm" onClick={(e) => (e.stopPropagation(), onChange(null))}>
                  <Trash2 /> Remover
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="upload-vazio">
            <ImagePlus />
            <strong style={{ display: "block", color: "var(--forest)" }}>Clique ou arraste uma foto</strong>
            <small>JPG, PNG ou WEBP · reduzimos automaticamente</small>
          </div>
        )}
        {enviando && (
          <div className="upload-carregando">
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> Enviando…
            </span>
          </div>
        )}
      </div>
      {erro && <p className="erro" style={{ marginTop: 8 }}>{erro}</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (enviar(e.target.files?.[0]), (e.target.value = ""))} />
    </div>
  );
}
