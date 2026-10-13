"use client";

import { Reorder } from "motion/react";
import { GripVertical, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarCategorias } from "@/app/admin/actions";

type Item = { chave: string; id: number | null; nome: string; total: number };

export function EditorCategorias({ inicial }: { inicial: { id: number; nome: string; total: number }[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(inicial.map((c) => ({ ...c, chave: String(c.id) })));
  const [removidas, setRemovidas] = useState<number[]>([]);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function remover(i: Item) {
    if (i.total > 0 && !confirm(`"${i.nome}" tem ${i.total} produtos. Eles ficarão sem categoria. Continuar?`)) return;
    if (i.id) setRemovidas((r) => [...r, i.id!]);
    setItens((l) => l.filter((x) => x.chave !== i.chave));
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarCategorias(
        itens.map(({ id, nome }) => ({ id, nome })),
        removidas,
      );
      setMsg(r.ok ? { ok: true, texto: "Categorias salvas." } : { ok: false, texto: r.erro });
      if (r.ok) {
        setRemovidas([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="cartao" style={{ maxWidth: 720 }}>
      <p style={{ marginBottom: 14 }}>Arraste pela alça para mudar a ordem.</p>
      <Reorder.Group axis="y" values={itens} onReorder={setItens} className="lista-edit" style={{ listStyle: "none" }}>
        {itens.map((i) => (
          <Reorder.Item key={i.chave} value={i} className="lista-edit-item" style={{ gridTemplateColumns: "auto 1fr auto auto", alignItems: "center" }}>
            <GripVertical size={18} style={{ cursor: "grab", color: "var(--muted)" }} aria-label="Arrastar" />
            <input
              className="input"
              value={i.nome}
              onChange={(e) => setItens((l) => l.map((x) => (x.chave === i.chave ? { ...x, nome: e.target.value } : x)))}
              aria-label="Nome da categoria"
            />
            <small style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{i.total} produtos</small>
            <button type="button" className="btn-icone perigo" onClick={() => remover(i)} aria-label={`Remover ${i.nome}`}>
              <Trash2 />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        style={{ marginTop: 14 }}
        onClick={() => setItens((l) => [...l, { chave: `n${Date.now()}`, id: null, nome: "", total: 0 }])}
      >
        <Plus /> Nova categoria
      </button>
      <div className="barra-salvar">
        {msg && <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`}>{msg.texto}</span>}
        <button className="btn btn-primary" onClick={salvar} disabled={pendente}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Salvar categorias"}
        </button>
      </div>
    </div>
  );
}
