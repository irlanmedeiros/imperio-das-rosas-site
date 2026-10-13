"use client";

import { Pencil, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { alternarProduto } from "@/app/admin/actions";
import type { Categoria, Produto } from "@/db/schema";
import { brl, normalizar } from "@/lib/format";

type Campo = "ativo" | "destaque";

export function ListaProdutos({ produtos, categorias }: { produtos: Produto[]; categorias: Categoria[] }) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const [vis, setVis] = useState("todos");
  const [, iniciar] = useTransition();
  const [lista, aplicar] = useOptimistic(produtos, (atual, m: { id: number; campo: Campo; valor: boolean }) =>
    atual.map((p) => (p.id === m.id ? { ...p, [m.campo]: m.valor } : p)),
  );
  const nomeCat = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);

  const filtrados = lista.filter((p) => {
    if (cat !== "todas" && String(p.categoriaId) !== cat) return false;
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

  return (
    <>
      <div className="filtros">
        <label className="busca busca-adm" style={{ minHeight: 42 }}>
          <Search />
          <input placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
        </label>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select className="input" value={vis} onChange={(e) => setVis(e.target.value)} aria-label="Visibilidade">
          <option value="todos">Todos</option>
          <option value="visiveis">Visíveis no site</option>
          <option value="ocultos">Ocultos</option>
          <option value="destaques">Em destaque</option>
        </select>
      </div>
      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
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
                  <div className="celula-produto">
                    <div className="miniatura">{p.foto && <Image src={p.foto} alt="" fill sizes="46px" />}</div>
                    <Link href={`/admin/produtos/${p.id}`}>{p.nome}</Link>
                  </div>
                </td>
                <td>{p.categoriaId ? nomeCat.get(p.categoriaId) : "—"}</td>
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
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>
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
