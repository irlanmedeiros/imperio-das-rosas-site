"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleCheck, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCarrinho, type ItemCarrinho } from "@/components/carrinho";
import { Flor } from "@/components/icones";
import { brl } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LinhaItem({ item, editavel = true }: { item: ItemCarrinho; editavel?: boolean }) {
  const { alterar, remover } = useCarrinho();
  return (
    <motion.div
      layout
      className="item-carrinho"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <Link href={`/produto/${item.slug}`} className="item-carrinho-foto">
        {item.foto ? <Image src={item.foto} alt="" fill sizes="80px" /> : <Flor style={{ margin: 18, color: "var(--sage)" }} />}
      </Link>
      <div>
        <h3>{item.nome}</h3>
        <span className="preco">{brl(item.preco)}</span>
        {editavel ? (
          <div className="qtd" role="group" aria-label={`Quantidade de ${item.nome}`}>
            <button onClick={() => alterar(item.id, item.qtd - 1)} aria-label="Diminuir">
              <Minus />
            </button>
            <span aria-live="polite">{item.qtd}</span>
            <button onClick={() => alterar(item.id, item.qtd + 1)} aria-label="Aumentar">
              <Plus />
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Qtd.: {item.qtd}</div>
        )}
      </div>
      {editavel ? (
        <button className="remover" onClick={() => remover(item.id)} aria-label={`Remover ${item.nome}`}>
          <Trash2 />
        </button>
      ) : (
        <strong style={{ fontSize: 14 }}>{brl(item.preco * item.qtd)}</strong>
      )}
    </motion.div>
  );
}

export function GavetaCarrinho() {
  const { itens, total, aberto, fechar, aviso, abrir, fecharAviso } = useCarrinho();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fechar]);

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <>
            <motion.div className="veu" onClick={fechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="gaveta"
              role="dialog"
              aria-modal="true"
              aria-label="Carrinho"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <div className="gaveta-topo">
                <h2>Seu carrinho</h2>
                <button className="icon-btn" onClick={fechar} aria-label="Fechar carrinho">
                  <X />
                </button>
              </div>
              {itens.length === 0 ? (
                <div className="gaveta-vazia">
                  <ShoppingBag />
                  <p>Seu carrinho está vazio.<br />Que tal escolher algo especial?</p>
                  <Link href="/catalogo" className="btn btn-primary" onClick={fechar}>
                    Ver catálogo
                  </Link>
                </div>
              ) : (
                <>
                  <div className="gaveta-itens">
                    <AnimatePresence initial={false}>
                      {itens.map((i) => (
                        <LinhaItem key={i.id} item={i} />
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="gaveta-rodape">
                    <div className="linha-total">
                      <span>Subtotal</span>
                      <motion.strong key={total} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        {brl(total)}
                      </motion.strong>
                    </div>
                    <p className="nota">Entrega, data e cartão você escolhe no próximo passo.</p>
                    <Link href="/checkout" className="btn btn-primary btn-block" onClick={fechar}>
                      Finalizar pedido <ArrowRight />
                    </Link>
                  </div>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aviso && !aberto && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <CircleCheck />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "52vw" }}>{aviso}</span>
            <button onClick={abrir}>Ver</button>
            <button onClick={fecharAviso} aria-label="Fechar aviso">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
