"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Flor } from "@/components/icones";
import type { CategoriaPublica, ProdutoPublico } from "@/lib/data";
import { normalizar } from "@/lib/format";
import { ProdutoCard } from "./produto-card";

const PASSO = 16;
type Ordem = "relevancia" | "menor" | "maior" | "az";

export function Catalogo({
  produtos,
  categorias,
  catInicial,
  buscaInicial,
}: {
  produtos: ProdutoPublico[];
  categorias: CategoriaPublica[];
  catInicial: string;
  buscaInicial: string;
}) {
  const [cat, setCat] = useState(catInicial);
  const [busca, setBusca] = useState(buscaInicial);
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [limite, setLimite] = useState(PASSO);
  const buscaAdiada = useDeferredValue(busca);

  // mantém a URL compartilhável sem recarregar a página
  useEffect(() => {
    const p = new URLSearchParams();
    if (cat !== "todos") p.set("categoria", cat);
    if (buscaAdiada.trim()) p.set("q", buscaAdiada.trim());
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [cat, buscaAdiada]);

  const lista = useMemo(() => {
    const termos = normalizar(buscaAdiada).split(/\s+/).filter(Boolean);
    const r = produtos.filter(
      (p) => (cat === "todos" || p.categoria === cat) && termos.every((t) => normalizar(p.nome).includes(t)),
    );
    if (ordem === "menor") r.sort((a, b) => a.preco - b.preco);
    if (ordem === "maior") r.sort((a, b) => b.preco - a.preco);
    if (ordem === "az") r.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return r;
  }, [produtos, cat, buscaAdiada, ordem]);

  const chips = [{ slug: "todos", nome: "Todos", total: produtos.length }, ...categorias];

  return (
    <>
      <div className="catalogo-barra">
        <div className="linha">
          <LayoutGroup id="chips">
            <div className="chips" role="tablist" aria-label="Categorias">
              {chips.map((c) => (
                <button
                  key={c.slug}
                  role="tab"
                  aria-selected={cat === c.slug}
                  className={`chip${cat === c.slug ? " ativo" : ""}`}
                  onClick={() => {
                    setCat(c.slug);
                    setLimite(PASSO);
                  }}
                >
                  {cat === c.slug && <motion.span layoutId="chip-fundo" className="chip-fundo" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <span>
                    {c.nome}
                    <small>{c.total}</small>
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <label className="busca">
            <Search />
            <input
              type="search"
              placeholder="Buscar: lírios, girassóis, box…"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setLimite(PASSO);
              }}
              aria-label="Buscar produto"
            />
            {busca && (
              <button onClick={() => setBusca("")} aria-label="Limpar busca" style={{ display: "grid", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            )}
          </label>
          <select className="ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar">
            <option value="relevancia">Mais relevantes</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
            <option value="az">Nome (A–Z)</option>
          </select>
        </div>
      </div>

      <p className="resultado-info" aria-live="polite">
        {lista.length} {lista.length === 1 ? "produto" : "produtos"}
        {buscaAdiada.trim() && <> para “{buscaAdiada.trim()}”</>}
      </p>

      {lista.length === 0 ? (
        <div className="vazio">
          <Flor />
          <p>Nada encontrado. Tente outra palavra ou fale com a gente: montamos do seu jeito.</p>
        </div>
      ) : (
        <motion.div layout className="grade">
          <h2 className="sr-only">Produtos</h2>
          <AnimatePresence mode="popLayout" initial={false}>
            {lista.slice(0, limite).map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: Math.min(i % PASSO, 8) * 0.035 } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              >
                <ProdutoCard p={p} prioridade={i < 4} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {lista.length > limite && (
        <div className="secao-acao">
          <button className="btn btn-outline" onClick={() => setLimite((l) => l + PASSO)}>
            Ver mais ({lista.length - limite})
          </button>
        </div>
      )}
    </>
  );
}
