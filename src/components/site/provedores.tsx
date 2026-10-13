"use client";

import { MotionConfig } from "motion/react";
import { CarrinhoProvider } from "@/components/carrinho";

export function Provedores({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CarrinhoProvider>{children}</CarrinhoProvider>
    </MotionConfig>
  );
}
