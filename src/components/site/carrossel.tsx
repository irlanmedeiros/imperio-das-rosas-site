"use client";

import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProdutoPublico } from "@/lib/data";
import { ProdutoCard } from "./produto-card";

const VELOCIDADE = 38; // px por segundo na esteira automática

/**
 * Esteira contínua: os produtos passam sozinhos em loop infinito, desaceleram ao passar o mouse,
 * aceitam arrastar (dedo/mouse) e têm setas laterais para avançar um card por vez.
 */
export function Carrossel({
  titulo,
  verTudo,
  produtos,
  sentido = "esquerda",
}: {
  titulo: string;
  verTudo?: string;
  produtos: ProdutoPublico[];
  /** para onde a esteira anda sozinha */
  sentido?: "esquerda" | "direita";
}) {
  const direcao = sentido === "direita" ? -1 : 1;
  const reduzir = useReducedMotion();
  const janela = useRef<HTMLDivElement>(null);
  const trilha = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const fator = useRef(1); // 1 = andando, 0 = parado (interpolado para frear/acelerar suave)
  const alvo = useRef(1);
  const visivel = useRef(false);
  const arrastou = useRef(false);
  const retomar = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [larguraLoop, setLarguraLoop] = useState(0);

  // repete a lista o suficiente para preencher a tela e emendar sem corte
  const copias = produtos.length >= 8 ? 2 : produtos.length >= 4 ? 3 : 4;
  const itens = Array.from({ length: copias }, (_, c) => produtos.map((p) => ({ p, chave: `${c}-${p.id}` }))).flat();

  useEffect(() => {
    const medir = () => trilha.current && setLarguraLoop(trilha.current.scrollWidth / copias);
    medir();
    const ro = new ResizeObserver(medir);
    if (trilha.current) ro.observe(trilha.current);
    const io = new IntersectionObserver(([e]) => (visivel.current = e.isIntersecting), { rootMargin: "100px" });
    if (janela.current) io.observe(janela.current);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [copias, produtos.length]);

  const embrulhar = (v: number) => (larguraLoop ? ((v % larguraLoop) - larguraLoop) % larguraLoop : v);

  useAnimationFrame((_, delta) => {
    if (!larguraLoop) return;
    fator.current += (alvo.current - fator.current) * Math.min(1, delta / 260);
    if (!reduzir && visivel.current && fator.current > 0.002) {
      x.set(embrulhar(x.get() - (direcao * VELOCIDADE * fator.current * delta) / 1000));
    }
  });

  function pausar(ms?: number) {
    alvo.current = 0;
    clearTimeout(retomar.current);
    if (ms) retomar.current = setTimeout(() => (alvo.current = 1), ms);
  }

  function passo(dir: 1 | -1) {
    const card = trilha.current?.firstElementChild as HTMLElement | null;
    const largura = card ? card.offsetWidth + parseFloat(getComputedStyle(trilha.current!).columnGap || "20") : 280;
    pausar(4500);
    const inicio = x.get();
    animate(x, inicio - dir * largura, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => x.set(embrulhar(x.get())),
    });
  }

  if (produtos.length === 0) return null;

  return (
    <div className="carrossel">
      <div className="carrossel-topo">
        <h2>{titulo}</h2>
        {verTudo && <Link href={verTudo}>Ver tudo →</Link>}
      </div>
      <div className="carrossel-area" onMouseEnter={() => pausar()} onMouseLeave={() => (alvo.current = 1)}>
        <div className="carrossel-janela" ref={janela}>
          <motion.div
            ref={trilha}
            className="esteira"
            style={{ x }}
            drag="x"
            dragMomentum={false}
            onDragStart={() => {
              arrastou.current = true;
              pausar();
            }}
            onDrag={() => x.set(embrulhar(x.get()))}
            onDragEnd={() => {
              x.set(embrulhar(x.get()));
              pausar(3500);
              setTimeout(() => (arrastou.current = false), 60);
            }}
            onTouchStart={() => pausar()}
            onTouchEnd={() => pausar(3500)}
            onClickCapture={(e) => {
              // um arrasto não deve abrir o produto nem adicionar ao carrinho
              if (arrastou.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onFocusCapture={() => pausar()}
            onBlurCapture={() => (alvo.current = 1)}
          >
            {itens.map(({ p, chave }, i) => (
              <div className="esteira-item" key={chave} aria-hidden={i >= produtos.length || undefined} inert={i >= produtos.length || undefined}>
                <ProdutoCard p={p} sizes="(max-width: 600px) 66vw, (max-width: 1000px) 33vw, 300px" />
              </div>
            ))}
          </motion.div>
        </div>
        <button className="seta seta-esq" onClick={() => passo(-1)} aria-label="Ver anteriores">
          <ArrowLeft />
        </button>
        <button className="seta seta-dir" onClick={() => passo(1)} aria-label="Ver próximos">
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}
