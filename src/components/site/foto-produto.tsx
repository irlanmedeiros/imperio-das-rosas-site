"use client";

import { Maximize2, X } from "lucide-react";
import Image, { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Foto da página do produto: mostra o arranjo inteiro (sem cortar) e, ao tocar, abre a foto ampliada
 * no tamanho que cabe na tela — maior, mas sem esticar nem cortar o buquê.
 */
export function FotoProduto({ src, alt }: { src: string; alt: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  // versão otimizada em alta (até a largura da tela); width/height só reservam espaço: o CSS usa o tamanho real da foto
  const { props: grande } = getImageProps({ src, alt, width: 1600, height: 2000, sizes: "min(100vw, 1100px)", quality: 85, loading: "eager" });
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  return (
    <>
      <button type="button" className="pdp-foto-botao" onClick={() => setAberta(true)} aria-label={`Ver foto ampliada de ${alt}`}>
        <Image src={src} alt={alt} fill preload fetchPriority="high" sizes="(max-width: 900px) 100vw, 50vw" />
        <span className="pdp-foto-ampliar" aria-hidden>
          <Maximize2 size={15} /> Ampliar
        </span>
      </button>
      <dialog
        ref={dialogo}
        className="foto-ampliada"
        aria-label={alt}
        onClose={() => setAberta(false)}
        onClick={(e) => {
          // clicar fora da foto (no fundo escuro) fecha
          if (e.target === e.currentTarget) setAberta(false);
        }}
      >
        {aberta && (
          // eslint-disable-next-line @next/next/no-img-element -- img comum para mostrar no tamanho natural (sem esticar)
          <img {...grande} alt={alt} style={undefined} />
        )}
        <button type="button" className="foto-ampliada-fechar" onClick={() => setAberta(false)} aria-label="Fechar foto">
          <X />
        </button>
      </dialog>
    </>
  );
}
