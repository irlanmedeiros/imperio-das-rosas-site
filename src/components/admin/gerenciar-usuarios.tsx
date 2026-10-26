"use client";

import { Eye, EyeOff, KeyRound, LoaderCircle, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarUsuario, mudarPapelUsuario, redefinirSenhaUsuario, removerUsuario } from "@/app/admin/actions";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/usuarios";

type Linha = { id: number; nome: string; email: string; papel: Papel; criadoEm: string };
type Msg = { ok: boolean; texto: string } | null;

const VAZIO = { nome: "", email: "", senha: "", papel: "equipe" as Papel };

export function GerenciarUsuarios({ eu, principal, usuarios }: { eu: string; principal: string; usuarios: Linha[] }) {
  const router = useRouter();
  const [novo, setNovo] = useState(VAZIO);
  const [verSenha, setVerSenha] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const [trocando, setTrocando] = useState<number | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  function rodar(acao: () => Promise<{ ok: true; mensagem?: string } | { ok: false; erro: string }>, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      setMsg(r.ok ? (r.mensagem ? { ok: true, texto: r.mensagem } : null) : { ok: false, texto: r.erro });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });
  }

  function criar(e: React.FormEvent) {
    e.preventDefault();
    rodar(() => criarUsuario(novo), () => setNovo(VAZIO));
  }

  function remover(u: Linha) {
    if (!confirm(`Remover ${u.nome} (${u.email})? Ele perde o acesso ao painel na hora.`)) return;
    rodar(() => removerUsuario(u.id));
  }

  return (
    <>
      <div className="cartao">
        <h2>Pessoas com acesso</h2>
        <ul className="usuarios-lista">
          {principal && (
            <li className="usuario">
              <div className="usuario-info">
                <strong>Conta principal</strong>
                <span>{principal}</span>
              </div>
              <span className="papel papel-dono">Dono</span>
              <small className="usuario-nota">Senha definida na hospedagem</small>
            </li>
          )}
          {usuarios.map((u) => {
            const souEu = u.email === eu;
            return (
              <li key={u.id} className="usuario">
                <div className="usuario-info">
                  <strong>
                    {u.nome}
                    {souEu && " (você)"}
                  </strong>
                  <span>{u.email}</span>
                </div>
                <select
                  className="input usuario-papel"
                  value={u.papel}
                  disabled={souEu || pendente}
                  onChange={(e) => rodar(() => mudarPapelUsuario(u.id, e.target.value as Papel))}
                  aria-label={`Acesso de ${u.nome}`}
                >
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>
                      {ROTULO_PAPEL[p]}
                    </option>
                  ))}
                </select>
                <div className="usuario-acoes">
                  <button type="button" className="btn-icone" onClick={() => (setTrocando(trocando === u.id ? null : u.id), setNovaSenha(""))} aria-label={`Trocar a senha de ${u.nome}`}>
                    <KeyRound />
                  </button>
                  {!souEu && (
                    <button type="button" className="btn-icone perigo" onClick={() => remover(u)} disabled={pendente} aria-label={`Remover ${u.nome}`}>
                      <Trash2 />
                    </button>
                  )}
                </div>
                {trocando === u.id && (
                  <form
                    className="usuario-senha"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rodar(() => redefinirSenhaUsuario(u.id, novaSenha), () => setTrocando(null));
                    }}
                  >
                    <input className="input" type="text" autoComplete="new-password" placeholder="Nova senha (8+ caracteres, letras e números)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} aria-label="Nova senha" />
                    <button className="btn btn-primary btn-sm" disabled={pendente || !novaSenha}>
                      Salvar senha
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {!usuarios.length && <p style={{ marginTop: 12 }}>Nenhum usuário extra ainda. Adicione abaixo quem mais vai usar o painel.</p>}
      </div>

      <form className="cartao" onSubmit={criar}>
        <h2>Novo usuário</h2>
        <div className="usuarios-form">
          <label className="field">
            <span>Nome</span>
            <input className="input" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} autoComplete="off" required />
          </label>
          <label className="field">
            <span>E-mail (login)</span>
            <input className="input" type="email" inputMode="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} autoComplete="off" required />
          </label>
          <label className="field">
            <span>Senha</span>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={verSenha ? "text" : "password"}
                value={novo.senha}
                onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
                autoComplete="new-password"
                required
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
                style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--muted)" }}
              >
                {verSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small>Mínimo de 8 caracteres, com letras e números.</small>
          </label>
          <label className="field">
            <span>Acesso</span>
            <select className="input" value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value as Papel })}>
              <option value="equipe">Equipe — tudo menos Usuários</option>
              <option value="dono">Dono — tudo, inclusive Usuários</option>
            </select>
          </label>
        </div>
        <div className="barra-salvar">
          {msg && (
            <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`} role={msg.ok ? "status" : "alert"}>
              {msg.texto}
            </span>
          )}
          <button className="btn btn-primary" disabled={pendente}>
            {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : <><UserPlus /> Adicionar usuário</>}
          </button>
        </div>
      </form>
    </>
  );
}
