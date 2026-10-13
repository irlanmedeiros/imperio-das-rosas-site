"use client";

import { ClipboardList, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Package, Settings, Tags, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "@/app/admin/login/actions";

const ITENS = [
  { href: "/admin", rotulo: "Visão geral", icone: LayoutDashboard },
  { href: "/admin/pedidos", rotulo: "Pedidos", icone: ClipboardList },
  { href: "/admin/produtos", rotulo: "Produtos", icone: Package },
  { href: "/admin/categorias", rotulo: "Categorias", icone: Tags },
  { href: "/admin/conteudo", rotulo: "Textos e banners", icone: FileText },
  { href: "/admin/configuracoes", rotulo: "Configurações", icone: Settings },
];

export function LateralAdmin({ pedidosNovos }: { pedidosNovos: number }) {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <div className="adm-mobile">
        <button onClick={() => setAberta(true)} aria-label="Abrir menu">
          <Menu />
        </button>
        <strong>Painel</strong>
        <span style={{ width: 44 }} />
      </div>
      <aside className={`adm-lateral${aberta ? " aberta" : ""}`}>
        <div className="adm-marca">
          <div>
            <Image src="/img/logo-clara.png" alt="Império das Rosas" width={1000} height={508} sizes="160px" />
            <small>Painel da loja</small>
          </div>
          <button className="adm-fechar" onClick={() => setAberta(false)} aria-label="Fechar menu" style={{ marginLeft: "auto", color: "var(--on-dark)" }}>
            {aberta && <X size={20} />}
          </button>
        </div>
        <nav className="adm-nav">
          {ITENS.map((i) => {
            const ativo = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} className={ativo ? "ativo" : undefined} onClick={() => setAberta(false)}>
                <i.icone />
                {i.rotulo}
                {i.href === "/admin/pedidos" && pedidosNovos > 0 && <span className="contador">{pedidosNovos}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="adm-lateral-rodape">
          <a href="/" target="_blank" rel="noopener">
            <ExternalLink /> Ver site
          </a>
          <form action={sair}>
            <button>
              <LogOut /> Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
