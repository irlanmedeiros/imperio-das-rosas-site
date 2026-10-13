"use client";

import { motion } from "motion/react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Marca } from "@/components/site/cabecalho";
import { entrar, type EstadoLogin } from "./actions";

export function FormLogin({ de }: { de: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [ver, setVer] = useState(false);
  return (
    <motion.form
      action={acao}
      className="login-form"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Marca className="marca-login" />
      <h1>Painel da loja</h1>
      <p>Entre para gerenciar produtos, pedidos e o conteúdo do site.</p>
      <input type="hidden" name="de" value={de} />
      <div style={{ display: "grid", gap: 16 }}>
        <label className="field">
          <span>E-mail</span>
          <input className="input" type="email" name="email" autoComplete="username" required autoFocus />
        </label>
        <label className="field">
          <span>Senha</span>
          <div style={{ position: "relative" }}>
            <input className="input" type={ver ? "text" : "password"} name="senha" autoComplete="current-password" required style={{ paddingRight: 48 }} />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? "Esconder senha" : "Mostrar senha"}
              style={{ position: "absolute", right: 6, top: 4, width: 38, height: 38, display: "grid", placeItems: "center", color: "var(--muted)" }}
            >
              {ver ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {estado.erro && (
          <motion.p className="erro" role="alert" initial={{ x: -8 }} animate={{ x: [8, -6, 4, 0] }} transition={{ duration: 0.4 }}>
            {estado.erro}
          </motion.p>
        )}
        <button className="btn btn-primary btn-block" disabled={pendente}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Entrar"}
        </button>
        <Link href="/" style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          ← Voltar ao site
        </Link>
      </div>
    </motion.form>
  );
}
