"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export type ItemCarrinho = { id: number; slug: string; nome: string; preco: number; foto: string | null; qtd: number };
type NovoItem = Omit<ItemCarrinho, "qtd">;

/* ---------- Store do carrinho no localStorage (sincroniza entre abas) ---------- */

const CHAVE = "imperio-carrinho-v1";
const VAZIO: ItemCarrinho[] = [];
const ouvintes = new Set<() => void>();
let cacheBruto: string | null = null;
let cacheItens: ItemCarrinho[] = VAZIO;

function ler(): ItemCarrinho[] {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {}
  if (bruto !== cacheBruto) {
    cacheBruto = bruto;
    try {
      cacheItens = bruto ? (JSON.parse(bruto) as ItemCarrinho[]) : VAZIO;
    } catch {
      cacheItens = VAZIO;
    }
  }
  return cacheItens;
}

function gravar(itens: ItemCarrinho[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {}
  ouvintes.forEach((o) => o());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const outraAba = (e: StorageEvent) => e.key === CHAVE && ouvinte();
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", outraAba);
  };
}

const semAssinatura = () => () => {};

/** true só no navegador, depois da hidratação (evita divergência com o HTML do servidor). */
export function useHidratado() {
  return useSyncExternalStore(semAssinatura, () => true, () => false);
}

/* ---------- Contexto ---------- */

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

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const itens = useSyncExternalStore(assinar, ler, () => VAZIO);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout>>(undefined);

  // trava a rolagem da página com a gaveta aberta
  useEffect(() => {
    document.documentElement.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [aberto]);

  const adicionar = useCallback((item: NovoItem, qtd = 1) => {
    const atual = ler();
    const existe = atual.find((i) => i.id === item.id);
    gravar(existe ? atual.map((i) => (i.id === item.id ? { ...i, ...item, qtd: Math.min(i.qtd + qtd, 99) } : i)) : [...atual, { ...item, qtd }]);
    setAviso(`${item.nome} foi para o carrinho`);
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 3800);
  }, []);

  const alterar = useCallback((id: number, qtd: number) => {
    const atual = ler();
    gravar(qtd <= 0 ? atual.filter((i) => i.id !== id) : atual.map((i) => (i.id === id ? { ...i, qtd: Math.min(qtd, 99) } : i)));
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
      remover: (id) => gravar(ler().filter((i) => i.id !== id)),
      limpar: () => gravar(VAZIO),
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
