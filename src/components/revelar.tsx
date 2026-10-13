"use client";

import { motion, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const itemVariants: Variants = {
  oculto: { opacity: 0, y: 28 },
  visivel: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/** Revela o conteúdo ao entrar na tela (uma vez). */
export function Revelar({
  children,
  atraso = 0,
  className,
  como = "div",
}: {
  children: React.ReactNode;
  atraso?: number;
  className?: string;
  como?: "div" | "section" | "li" | "header";
}) {
  const M = motion[como];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.85, ease: EASE, delay: atraso }}
    >
      {children}
    </M>
  );
}

/** Grade/lista cujos filhos <RevelarItem> entram em cascata. */
export function RevelarGrupo({ children, className, intervalo = 0.08 }: { children: React.ReactNode; className?: string; intervalo?: number }) {
  return (
    <motion.div
      className={className}
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      variants={{ visivel: { transition: { staggerChildren: intervalo } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevelarItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
