"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCarrinho } from "@/components/carrinho";
import { Flor } from "@/components/icones";
import { brl } from "@/lib/format";
import type { ProdutoPublico } from "@/lib/data";

export function Preco({ p }: { p: Pick<ProdutoPublico, "preco" | "precoDe"> }) {
  return (
    <span className="preco">
      {p.precoDe && p.precoDe > p.preco && <del>{brl(p.precoDe)}</del>}
      {brl(p.preco)}
    </span>
  );
}

export function BotaoAdicionar({ p, className = "add-btn", children }: { p: ProdutoPublico; className?: string; children?: React.ReactNode }) {
  const { adicionar } = useCarrinho();
  const [ok, setOk] = useState(false);
  return (
    <button
      className={`${className}${ok ? " ok" : ""}`}
      aria-label={children ? undefined : `Adicionar ${p.nome} ao carrinho`}
      onClick={(e) => {
        e.preventDefault();
        adicionar({ id: p.id, slug: p.slug, nome: p.nome, preco: p.preco, foto: p.foto });
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={ok ? "ok" : "bag"}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
        >
          {ok ? <Check /> : <ShoppingBag />}
          {children}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const SIZES_GRADE = "(max-width: 640px) 50vw, (max-width: 1080px) 33vw, 300px";

export function ProdutoCard({ p, prioridade = false, sizes = SIZES_GRADE }: { p: ProdutoPublico; prioridade?: boolean; sizes?: string }) {
  const promo = p.precoDe && p.precoDe > p.preco;
  return (
    <article className="produto">
      <Link href={`/produto/${p.slug}`} className="produto-img" aria-label={p.nome}>
        {promo && <span className="selo-promo">Promo</span>}
        {p.foto ? (
          <Image src={p.foto} alt={p.nome} fill sizes={sizes} loading={prioridade ? "eager" : "lazy"} />
        ) : (
          <Flor style={{ width: 56, margin: "auto", position: "absolute", inset: 0, color: "var(--sage)" }} />
        )}
      </Link>
      <div className="produto-info">
        <div>
          <h3>
            <Link href={`/produto/${p.slug}`}>{p.nome}</Link>
          </h3>
          <Preco p={p} />
        </div>
        <BotaoAdicionar p={p} />
      </div>
    </article>
  );
}
