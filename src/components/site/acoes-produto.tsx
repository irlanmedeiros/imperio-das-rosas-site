"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useCarrinho } from "@/components/carrinho";
import { WhatsAppIcone } from "@/components/icones";
import type { ProdutoPublico } from "@/lib/data";
import { brl } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";
import { BotaoAdicionar } from "./produto-card";

export function AcoesProduto({ p, whatsapp }: { p: ProdutoPublico; whatsapp: string }) {
  const [qtd, setQtd] = useState(1);
  const { adicionar } = useCarrinho();
  return (
    <>
      <div className="pdp-acoes">
        <div className="qtd" role="group" aria-label="Quantidade">
          <button onClick={() => setQtd((q) => Math.max(1, q - 1))} aria-label="Diminuir">
            <Minus />
          </button>
          <span aria-live="polite">{qtd}</span>
          <button onClick={() => setQtd((q) => Math.min(99, q + 1))} aria-label="Aumentar">
            <Plus />
          </button>
        </div>
        {qtd === 1 ? (
          <BotaoAdicionar p={p} className="btn btn-primary">
            Adicionar ao carrinho
          </BotaoAdicionar>
        ) : (
          <button className="btn btn-primary" onClick={() => adicionar({ id: p.id, slug: p.slug, nome: p.nome, preco: p.preco, foto: p.foto }, qtd)}>
            Adicionar {qtd} · {brl(p.preco * qtd)}
          </button>
        )}
      </div>
      <a
        className="btn btn-whats btn-block"
        style={{ marginBottom: 22 }}
        href={linkWhatsApp(whatsapp, `Olá! Vim pelo site e tenho interesse no ${p.nome} (${brl(p.preco)}) 🌹`)}
        target="_blank"
        rel="noopener"
      >
        <WhatsAppIcone /> Tirar dúvidas no WhatsApp
      </a>
    </>
  );
}
