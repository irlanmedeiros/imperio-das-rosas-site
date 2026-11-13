"use client";

import { ArrowUpDown, FolderInput, LoaderCircle, Pencil, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { alternarProduto, moverProdutosDeCategoria } from "@/app/admin/actions";
import type { Categoria, Produto } from "@/db/schema";
import { arvoreCategorias, opcoesCategoria, rotuloCategoria } from "@/lib/categorias";
import { brl, normalizar } from "@/lib/format";
import { OrdenarProdutos } from "./ordenar-produtos";

type Campo = "ativo" | "destaque";

export function ListaProdutos({ produtos, categorias }: { produtos: Produto[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const [vis, setVis] = useState("todos");
  const [modo, setModo] = useState<"lista" | "ordem">("lista");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [destinoLote, setDestinoLote] = useState("");
  const [msgLote, setMsgLote] = useState<{ ok: boolean; texto: string } | null>(null);
  const [movendo, iniciarLote] = useTransition();
  const [, iniciar] = useTransition();
  const [lista, aplicar] = useOptimistic(produtos, (atual, m: { id: number; campo: Campo; valor: boolean }) =>
    atual.map((p) => (p.id === m.id ? { ...p, [m.campo]: m.valor } : p)),
  );
  const opcoes = useMemo(() => opcoesCategoria(categorias), [categorias]);

  // filtro por categoria principal inclui as subcategorias dela
  const idsDoFiltro = useMemo(() => {
    if (cat === "todas" || cat === "sem") return null;
    const id = Number(cat);
    const principal = arvoreCategorias(categorias).find((p) => p.id === id);
    return new Set([id, ...(principal?.filhas.map((f) => f.id) ?? [])]);
  }, [cat, categorias]);

  const filtrados = lista.filter((p) => {
    if (cat === "sem" && p.categoriaId) return false;
    if (idsDoFiltro && !idsDoFiltro.has(p.categoriaId ?? -1)) return false;
    if (vis === "visiveis" && !p.ativo) return false;
    if (vis === "ocultos" && p.ativo) return false;
    if (vis === "destaques" && !p.destaque) return false;
    const t = normalizar(busca.trim());
    return !t || normalizar(p.nome).includes(t);
  });

  function alternar(id: number, campo: Campo, valor: boolean) {
    iniciar(async () => {
      aplicar({ id, campo, valor });
      await alternarProduto(id, campo, valor);
    });
  }

  function marcar(id: number, sim: boolean) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (sim) n.add(id);
      else n.delete(id);
      return n;
    });
    setMsgLote(null);
  }

  const todosMarcados = filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id));

  function moverLote() {
    if (!destinoLote) return setMsgLote({ ok: false, texto: "Escolha a categoria de destino." });
    const ids = [...selecionados];
    iniciarLote(async () => {
      const r = await moverProdutosDeCategoria(ids, destinoLote === "sem" ? null : Number(destinoLote));
      setMsgLote(r.ok ? { ok: true, texto: r.mensagem ?? "Produtos movidos." } : { ok: false, texto: r.erro });
      if (r.ok) {
        setSelecionados(new Set());
        router.refresh();
      }
    });
  }

  const filtroCategoria = (
    <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
      <option value="todas">Todas as categorias</option>
      {opcoes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.sub ? `   ${c.rotulo}` : c.rotulo}
        </option>
      ))}
      <option value="sem">Sem categoria</option>
    </select>
  );

  if (modo === "ordem") {
    const daVez = lista.filter((p) => (cat === "sem" ? !p.categoriaId : !idsDoFiltro || idsDoFiltro.has(p.categoriaId ?? -1)));
    return (
      <>
        <div className="filtros">
          {filtroCategoria}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setModo("lista")}>
            <X /> Fechar organização
          </button>
        </div>
        <OrdenarProdutos key={cat} produtos={daVez} rotuloCat={(id) => rotuloCategoria(categorias, id)} titulo={cat === "todas" ? "todos os produtos (aba “Todos” do catálogo)" : (opcoes.find((o) => String(o.id) === cat)?.rotulo ?? "sem categoria")} />
      </>
    );
  }

  return (
    <>
      <div className="filtros">
        <label className="busca busca-adm" style={{ minHeight: 42 }}>
          <Search />
          <input placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
        </label>
        {filtroCategoria}
        <select className="input" value={vis} onChange={(e) => setVis(e.target.value)} aria-label="Visibilidade">
          <option value="todos">Todos</option>
          <option value="visiveis">Visíveis no site</option>
          <option value="ocultos">Ocultos</option>
          <option value="destaques">Em destaque</option>
        </select>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setModo("ordem")} title="Escolher a posição de cada produto no site">
          <ArrowUpDown /> Organizar ordem
        </button>
      </div>

      {selecionados.size > 0 && (
        <div className="barra-lote" role="region" aria-label="Ações para os produtos marcados">
          <strong>
            {selecionados.size} {selecionados.size === 1 ? "marcado" : "marcados"}
          </strong>
          <select className="input" value={destinoLote} onChange={(e) => setDestinoLote(e.target.value)} aria-label="Mover para a categoria">
            <option value="">Mover para…</option>
            {opcoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
            <option value="sem">Sem categoria</option>
          </select>
          <button type="button" className="btn btn-primary btn-sm" onClick={moverLote} disabled={movendo}>
            {movendo ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : <FolderInput />} Mover
          </button>
          <button type="button" className="btn-link" onClick={() => setSelecionados(new Set())}>
            Desmarcar
          </button>
          {msgLote && <span className={`msg ${msgLote.ok ? "msg-ok" : "erro"}`}>{msgLote.texto}</span>}
        </div>
      )}
      {msgLote && selecionados.size === 0 && <p className={`msg ${msgLote.ok ? "msg-ok" : "erro"}`} style={{ marginBottom: 12 }}>{msgLote.texto}</p>}

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  className="marcar"
                  checked={todosMarcados}
                  onChange={(e) => {
                    const sim = e.target.checked;
                    setSelecionados((s) => {
                      const n = new Set(s);
                      for (const p of filtrados) {
                        if (sim) n.add(p.id);
                        else n.delete(p.id);
                      }
                      return n;
                    });
                  }}
                  aria-label="Marcar todos da lista"
                />
              </th>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th title="Aparece no site">No site</th>
              <th title="Aparece nos carrosséis da página inicial">Destaque</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} className={p.ativo ? undefined : "inativo"}>
                <td>
                  <input type="checkbox" className="marcar" checked={selecionados.has(p.id)} onChange={(e) => marcar(p.id, e.target.checked)} aria-label={`Marcar ${p.nome}`} />
                </td>
                <td>
                  <div className="celula-produto">
                    <div className="miniatura">{p.foto && <Image src={p.foto} alt="" fill sizes="46px" />}</div>
                    <Link href={`/admin/produtos/${p.id}`}>{p.nome}</Link>
                  </div>
                </td>
                <td>{rotuloCategoria(categorias, p.categoriaId) ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {p.precoDe ? <del style={{ color: "var(--muted)", fontSize: 12, marginRight: 6 }}>{brl(p.precoDe)}</del> : null}
                  <strong>{brl(p.preco)}</strong>
                </td>
                <td>
                  <label className="switch" aria-label={`Mostrar ${p.nome} no site`}>
                    <input type="checkbox" checked={p.ativo} onChange={(e) => alternar(p.id, "ativo", e.target.checked)} />
                    <span />
                  </label>
                </td>
                <td>
                  <label className="switch" aria-label={`Destacar ${p.nome}`}>
                    <input type="checkbox" checked={p.destaque} onChange={(e) => alternar(p.id, "destaque", e.target.checked)} />
                    <span />
                  </label>
                </td>
                <td>
                  <Link href={`/admin/produtos/${p.id}`} className="btn-icone" aria-label={`Editar ${p.nome}`}>
                    <Pencil />
                  </Link>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>
                  Nenhum produto com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
