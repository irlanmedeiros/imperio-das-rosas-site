"use client";

import { ArrowDown, ArrowUp, CornerDownRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarCategorias } from "@/app/admin/actions";

/** `pai` é a chave da categoria principal (subcategoria) ou null (principal). */
type Item = { chave: string; id: number | null; nome: string; total: number; pai: string | null };
export type CategoriaEditavel = { id: number; nome: string; total: number; paiId: number | null };

export function EditorCategorias({ inicial }: { inicial: CategoriaEditavel[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(() =>
    inicial.map((c) => ({ chave: String(c.id), id: c.id, nome: c.nome, total: c.total, pai: c.paiId ? String(c.paiId) : null })),
  );
  const [removidas, setRemovidas] = useState<number[]>([]);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const principais = itens.filter((i) => i.pai === null);
  const filhas = (chave: string) => itens.filter((i) => i.pai === chave);

  function alterar(chave: string, mudar: Partial<Item>) {
    setItens((l) => l.map((x) => (x.chave === chave ? { ...x, ...mudar } : x)));
    setMsg(null);
  }

  /** Sobe/desce dentro do mesmo grupo (principais, ou as subcategorias da mesma principal). */
  function mover(i: Item, direcao: -1 | 1) {
    setItens((l) => {
      const grupo = l.filter((x) => x.pai === i.pai);
      const pos = grupo.findIndex((x) => x.chave === i.chave);
      const alvo = grupo[pos + direcao];
      if (!alvo) return l;
      const a = l.findIndex((x) => x.chave === i.chave);
      const b = l.findIndex((x) => x.chave === alvo.chave);
      const nova = [...l];
      [nova[a], nova[b]] = [nova[b], nova[a]];
      return nova;
    });
    setMsg(null);
  }

  function remover(i: Item) {
    const subs = filhas(i.chave);
    const avisos = [
      i.total > 0 && `${i.total} produto(s) ficarão sem categoria`,
      subs.length > 0 && `as ${subs.length} subcategoria(s) viram categorias principais`,
    ].filter(Boolean);
    if (avisos.length && !confirm(`Remover "${i.nome}"? ${avisos.join(" e ")}.`)) return;
    if (i.id) setRemovidas((r) => [...r, i.id!]);
    setItens((l) => l.filter((x) => x.chave !== i.chave).map((x) => (x.pai === i.chave ? { ...x, pai: null } : x)));
  }

  function adicionar(pai: string | null) {
    setItens((l) => [...l, { chave: `n${Date.now()}`, id: null, nome: "", total: 0, pai }]);
  }

  function salvar() {
    iniciar(async () => {
      const r = await salvarCategorias(
        itens.map(({ chave, id, nome, pai }) => ({ chave, id, nome, pai })),
        removidas,
      );
      setMsg(r.ok ? { ok: true, texto: "Categorias salvas." } : { ok: false, texto: r.erro });
      if (r.ok) {
        setRemovidas([]);
        router.refresh();
      }
    });
  }

  const linha = (i: Item, grupo: Item[], sub: boolean) => {
    const pos = grupo.indexOf(i);
    const temFilhas = !sub && filhas(i.chave).length > 0;
    return (
      <div className={`cat-linha${sub ? " cat-sub" : ""}`}>
        {sub && <CornerDownRight size={16} className="cat-seta" aria-hidden />}
        <input
          className="input"
          value={i.nome}
          onChange={(e) => alterar(i.chave, { nome: e.target.value })}
          aria-label={sub ? "Nome da subcategoria" : "Nome da categoria"}
          placeholder={sub ? "Ex.: Rosas" : "Ex.: Buquês"}
        />
        <select
          className="input cat-pai"
          value={i.pai ?? ""}
          disabled={temFilhas}
          title={temFilhas ? "Tem subcategorias: continua como principal" : undefined}
          onChange={(e) => alterar(i.chave, { pai: e.target.value || null })}
          aria-label={`Onde fica ${i.nome || "a categoria"}`}
        >
          <option value="">Categoria principal</option>
          {principais
            .filter((p) => p.chave !== i.chave)
            .map((p) => (
              <option key={p.chave} value={p.chave}>
                Dentro de {p.nome || "(sem nome)"}
              </option>
            ))}
        </select>
        <small className="cat-total">{i.total} produtos</small>
        <div className="cat-acoes">
          <button type="button" className="btn-icone" onClick={() => mover(i, -1)} disabled={pos === 0} aria-label={`Subir ${i.nome}`}>
            <ArrowUp />
          </button>
          <button type="button" className="btn-icone" onClick={() => mover(i, 1)} disabled={pos === grupo.length - 1} aria-label={`Descer ${i.nome}`}>
            <ArrowDown />
          </button>
          <button type="button" className="btn-icone perigo" onClick={() => remover(i)} aria-label={`Remover ${i.nome}`}>
            <Trash2 />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="cartao" style={{ maxWidth: 860 }}>
      <p style={{ marginBottom: 14 }}>
        Use as setas para mudar a ordem. Para criar subcategorias (ex.: <strong>Buquês › Rosas, Girassol, Lírio</strong>), clique em <em>+ Subcategoria</em> dentro da categoria, ou mude o campo “Categoria principal” para “Dentro de…”.
      </p>
      <div className="lista-edit">
        {principais.map((p) => {
          const subs = filhas(p.chave);
          return (
            <div key={p.chave} className="lista-edit-item cat-grupo">
              {linha(p, principais, false)}
              {subs.map((f) => (
                <div key={f.chave}>{linha(f, subs, true)}</div>
              ))}
              <button type="button" className="btn btn-outline btn-sm cat-nova-sub" onClick={() => adicionar(p.chave)}>
                <Plus /> Subcategoria
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => adicionar(null)}>
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
