"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ItemCarrinho = { id: number; slug: string; nome: string; preco: number; foto: string | null; qtd: number };
type NovoItem = Omit<ItemCarrinho, "qtd">;

type Ctx = {
  itens: ItemCarrinho[];
  quantidade: number;
  total: number;
  aberto: boolean;
  aviso: string | null;
  adicionar: (item: NovoItem, qtd?: number) => void;
  alterar: (id: number, qtd: number) => void;
  remover: (id: number) => void;
  limpar: () => void;
  abrir: () => void;
  fechar: () => void;
  fecharAviso: () => void;
};

const CarrinhoCtx = createContext<Ctx | null>(null);
const CHAVE = "imperio-carrinho-v1";

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const carregado = useRef(false);
  const timerAviso = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) setItens(JSON.parse(salvo));
    } catch {}
    carregado.current = true;
  }, []);

  useEffect(() => {
    if (!carregado.current) return;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch {}
  }, [itens]);

  // trava a rolagem da página com a gaveta aberta
  useEffect(() => {
    document.documentElement.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [aberto]);

  const adicionar = useCallback((item: NovoItem, qtd = 1) => {
    setItens((atual) => {
      const existe = atual.find((i) => i.id === item.id);
      if (existe) return atual.map((i) => (i.id === item.id ? { ...i, ...item, qtd: Math.min(i.qtd + qtd, 99) } : i));
      return [...atual, { ...item, qtd }];
    });
    setAviso(`${item.nome} foi para o carrinho`);
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 3800);
  }, []);

  const alterar = useCallback((id: number, qtd: number) => {
    setItens((atual) => (qtd <= 0 ? atual.filter((i) => i.id !== id) : atual.map((i) => (i.id === id ? { ...i, qtd: Math.min(qtd, 99) } : i))));
  }, []);

  const valor = useMemo<Ctx>(
    () => ({
      itens,
      quantidade: itens.reduce((s, i) => s + i.qtd, 0),
      total: itens.reduce((s, i) => s + i.qtd * i.preco, 0),
      aberto,
      aviso,
      adicionar,
      alterar,
      remover: (id) => setItens((a) => a.filter((i) => i.id !== id)),
      limpar: () => setItens([]),
      abrir: () => {
        setAviso(null);
        setAberto(true);
      },
      fechar: () => setAberto(false),
      fecharAviso: () => setAviso(null),
    }),
    [itens, aberto, aviso, adicionar, alterar],
  );

  return <CarrinhoCtx.Provider value={valor}>{children}</CarrinhoCtx.Provider>;
}

export function useCarrinho() {
  const ctx = useContext(CarrinhoCtx);
  if (!ctx) throw new Error("useCarrinho fora do CarrinhoProvider");
  return ctx;
}
