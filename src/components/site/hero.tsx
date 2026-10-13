"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useHidratado } from "@/components/carrinho";
import { Folha, WhatsAppIcone } from "@/components/icones";
import type { Conteudo } from "@/lib/config-types";
import { linkWhatsApp } from "@/lib/whatsapp";

const EASE = [0.22, 1, 0.36, 1] as const;

type Gota = { left: number; size: number; opacity: number; dur: number; delay: number };

function gerarFolhas(): Gota[] {
  return Array.from({ length: 11 }, () => ({
    left: Math.random() * 100,
    size: 12 + Math.random() * 16,
    opacity: 0.25 + Math.random() * 0.4,
    dur: 10 + Math.random() * 9,
    delay: -Math.random() * 18,
  }));
}

/** Posições aleatórias: só existem no navegador (montado após a hidratação). */
function FolhasCaindo() {
  const [folhas] = useState(gerarFolhas);
  return (
    <div className="folhas" aria-hidden>
      {folhas.map((f, i) => (
        <Folha
          key={i}
          className="folha"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, opacity: f.opacity, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
        />
      ))}
    </div>
  );
}

export function Hero({ hero, whatsapp }: { hero: Conteudo["hero"]; whatsapp: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduzir = useReducedMotion();
  const hidratado = useHidratado();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const escala = useTransform(scrollYProgress, [0, 1], [1.04, 1.12]);
  const textoY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const textoOpacidade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const entrada = (d: number) => ({
    initial: { opacity: 0, y: 34 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: EASE, delay: d },
  });

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero-bg" style={reduzir ? undefined : { y, scale: escala }}>
        <Image src={hero.imagem} alt="Arranjo de flores do Império das Rosas" fill preload fetchPriority="high" sizes="100vw" quality={85} />
      </motion.div>
      {!reduzir && hidratado && <FolhasCaindo />}
      <motion.div className="hero-conteudo" style={reduzir ? undefined : { y: textoY, opacity: textoOpacidade }}>
        <div className="hero-texto">
          <motion.div className="hero-ornamento" {...entrada(0.1)}>
            Floricultura em João Pessoa
          </motion.div>
          <h1>
            <motion.span style={{ display: "block" }} {...entrada(0.2)}>
              {hero.titulo}
            </motion.span>
            {hero.tituloDestaque && <motion.em {...entrada(0.35)}>{hero.tituloDestaque}</motion.em>}
          </h1>
          <motion.p {...entrada(0.5)}>{hero.subtitulo}</motion.p>
          <motion.div className="hero-acoes" {...entrada(0.65)}>
            <Link href="/catalogo" className="btn btn-primary">
              {hero.botao} <ArrowRight />
            </Link>
            <a className="btn btn-light" href={linkWhatsApp(whatsapp, "Olá! Quero montar um buquê personalizado 🌹")} target="_blank" rel="noopener">
              <WhatsAppIcone /> Buquê personalizado
            </a>
          </motion.div>
        </div>
      </motion.div>
      <motion.div className="rolar-dica" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} />
    </section>
  );
}
