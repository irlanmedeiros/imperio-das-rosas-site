"use client";

import { useEffect } from "react";
import { WhatsAppIcone } from "@/components/icones";

/** No celular, logo após finalizar, já abre o WhatsApp com o pedido. No computador, fica o botão. */
export function EnviarWhatsApp({ url, automatico }: { url: string; automatico: boolean }) {
  useEffect(() => {
    if (!automatico || !window.matchMedia("(pointer: coarse)").matches) return;
    window.history.replaceState(null, "", window.location.pathname);
    const t = setTimeout(() => {
      window.location.href = url;
    }, 1200);
    return () => clearTimeout(t);
  }, [url, automatico]);

  return (
    <div style={{ marginBottom: 28 }}>
      <a className="btn btn-whats" href={url} target="_blank" rel="noopener" style={{ minHeight: 56, padding: "0 34px", fontSize: 14 }}>
        <WhatsAppIcone /> Enviar pedido no WhatsApp
      </a>
    </div>
  );
}
