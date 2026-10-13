"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCarrinho } from "@/components/carrinho";
import { WhatsAppIcone } from "@/components/icones";
import { linkWhatsApp } from "@/lib/whatsapp";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/catalogo", rotulo: "Catálogo" },
  { href: "/#ocasioes", rotulo: "Ocasiões" },
  { href: "/#sobre", rotulo: "Sobre nós" },
  { href: "/#contato", rotulo: "Contato" },
];

/** Logo oficial. `clara` = versão com letras creme, para fundos verde-escuros. */
export function Marca({ clara = false, className = "" }: { clara?: boolean; className?: string }) {
  return (
    <Link href="/" className={`marca ${className}`} aria-label="Império das Rosas — início">
      <Image src={clara ? "/img/logo-clara.png" : "/img/logo.png"} alt="Império das Rosas" width={1000} height={508} priority={!clara} sizes="240px" />
    </Link>
  );
}

export function Cabecalho({ whatsapp }: { whatsapp: string }) {
  const [rolado, setRolado] = useState(false);
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const { quantidade, abrir } = useCarrinho();

  useEffect(() => {
    const onScroll = () => setRolado(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  return (
    <>
      <header className={`header${rolado ? " rolado" : ""}`}>
        <nav className="nav container" aria-label="Principal">
          <Marca />
          <ul className="nav-links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
                  {l.rotulo}
                </Link>
              </li>
            ))}
          </ul>
          <div className="nav-acoes">
            <a className="btn btn-primary btn-sm" href={linkWhatsApp(whatsapp, "Olá! Vim pelo site 🌹")} target="_blank" rel="noopener">
              Fale conosco
            </a>
            <button className="icon-btn" onClick={abrir} aria-label={`Abrir carrinho (${quantidade} itens)`}>
              <ShoppingBag />
              <AnimatePresence>
                {quantidade > 0 && (
                  <motion.span
                    key={quantidade}
                    className="badge"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 520, damping: 18 }}
                  >
                    {quantidade}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button className="icon-btn menu-btn" onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu}>
              <Menu />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 32px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 40px) 32px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 40px) 32px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="menu-mobile-topo">
              <Marca />
              <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Fechar menu">
                <X />
              </button>
            </div>
            <motion.ul initial="o" animate="v" variants={{ v: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
              {LINKS.map((l) => (
                <motion.li key={l.href} variants={{ o: { opacity: 0, x: 24 }, v: { opacity: 1, x: 0 } }}>
                  <Link href={l.href} onClick={() => setMenu(false)}>
                    {l.rotulo} <ArrowRight />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
            <div className="menu-mobile-rodape">
              <button
                className="btn btn-outline btn-block"
                onClick={() => {
                  setMenu(false);
                  abrir();
                }}
              >
                <ShoppingBag /> Ver carrinho {quantidade > 0 && `(${quantidade})`}
              </button>
              <a className="btn btn-whats btn-block" href={linkWhatsApp(whatsapp, "Olá! Vim pelo site 🌹")} target="_blank" rel="noopener">
                <WhatsAppIcone /> Falar no WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
