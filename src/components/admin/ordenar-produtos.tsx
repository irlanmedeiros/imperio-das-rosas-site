"use client";

import { ArrowDown, ArrowDownWideNarrow, ArrowUp, ArrowUpToLine, LoaderCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarOrdemProdutos } from "@/app/admin/actions";
import type { Produto } from "@/db/schema";
import { brl } from "@/lib/format";
import { moverPara } from "@/lib/ordem";

/**
 * Escolhe a posição de cada produto no site ("Mais relevantes" no catálogo e carrosséis).
 * Organiza só o grupo filtrado; os demais produtos continuam onde estão.
 */
export function OrdenarProdutos({ produtos, titulo, rotuloCat }: { produtos: Produto[]; titulo: string; rotuloCat: (id: number | null) => string | null }) {
  const router = useRouter();
  const [lista, setLista] = useState(produtos);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const mudou = lista.some((p, i) => p.id !== produtos[i]?.id);

  function aplicar(nova: Produto[]) {
    setLista(nova);
    setMsg(null);
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarOrdemProdutos(lista.map((p) => p.id));
      setMsg(r.ok ? { ok: true, texto: "Ordem salva. O site já mostra assim." } : { ok: false, texto: r.erro });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="cartao ordenar-cartao">
      <div className="ordenar-topo">
        <div>
          <h2 style={{ marginBottom: 4 }}>Ordem de {titulo}</h2>
          <p style={{ margin: 0 }}>O nº 1 aparece primeiro no site. Use as setas, ou digite a posição desejada.</p>
        </div>
        <div className="ordenar-atalhos">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => aplicar([...lista].sort((a, b) => a.preco - b.preco))}>
            <ArrowDownWideNarrow /> Mais baratos primeiro
          </button>
          {mudou && (
            <button type="button" className="btn-link" onClick={() => aplicar(produtos)}>
              <RotateCcw size={14} /> Desfazer
            </button>
          )}
        </div>
      </div>

      <ol className="ordenar-lista">
        {lista.map((p, i) => (
          <li key={p.id} className={p.ativo ? undefined : "inativo"}>
            <input
              className="input ordenar-pos"
              inputMode="numeric"
              defaultValue={i + 1}
              key={`${p.id}-${i}`}
              aria-label={`Posição de ${p.nome}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              onBlur={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n - 1 !== i) aplicar(moverPara(lista, i, n - 1));
                else e.target.value = String(i + 1);
              }}
            />
            <div className="miniatura">{p.foto && <Image src={p.foto} alt="" fill sizes="46px" />}</div>
            <div className="ordenar-nome">
              <strong>{p.nome}</strong>
              <small>
                {brl(p.preco)} · {rotuloCat(p.categoriaId) ?? "Sem categoria"}
                {!p.ativo && " · oculto"}
              </small>
            </div>
            <div className="ordenar-acoes">
              <button type="button" className="btn-icone" onClick={() => aplicar(moverPara(lista, i, 0))} disabled={i === 0} aria-label={`Levar ${p.nome} para o topo`} title="Para o topo">
                <ArrowUpToLine />
              </button>
              <button type="button" className="btn-icone" onClick={() => aplicar(moverPara(lista, i, i - 1))} disabled={i === 0} aria-label={`Subir ${p.nome}`}>
                <ArrowUp />
              </button>
              <button type="button" className="btn-icone" onClick={() => aplicar(moverPara(lista, i, i + 1))} disabled={i === lista.length - 1} aria-label={`Descer ${p.nome}`}>
                <ArrowDown />
              </button>
            </div>
          </li>
        ))}
        {lista.length === 0 && <li style={{ color: "var(--muted)" }}>Nenhum produto nesta categoria.</li>}
      </ol>

      <div className="barra-salvar">
        {msg && <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`}>{msg.texto}</span>}
        <button className="btn btn-primary" onClick={salvar} disabled={pendente || !mudou}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Salvar ordem"}
        </button>
      </div>
    </div>
  );
}
