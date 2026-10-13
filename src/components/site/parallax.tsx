"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";

/** Imagem de fundo que se desloca mais devagar que a rolagem. */
export function FundoParallax({ src, className, intensidade = 18 }: { src: string; className: string; intensidade?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${intensidade / 2}%`, `${intensidade / 2}%`]);
  return (
    <motion.div ref={ref} className={className} style={reduzir ? undefined : { y }}>
      <Image src={src} alt="" fill sizes="100vw" />
    </motion.div>
  );
}

/** Foto que entra com leve zoom-out e desliza na rolagem. */
export function FotoFlutuante({ src, alt, className, children }: { src: string; alt: string; className: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 1.06 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div style={reduzir ? { position: "absolute", inset: 0 } : { y, position: "absolute", inset: "-8% 0" }}>
        <Image src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, 55vw" />
      </motion.div>
      {children}
    </motion.div>
  );
}
