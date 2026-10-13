"use client";

import { ExternalLink, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { salvarConteudo } from "@/app/admin/actions";
import type { Conteudo } from "@/lib/config-types";
import { UploadImagem } from "./upload-imagem";

function Campo({ rotulo, valor, onChange, area = false, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; area?: boolean; dica?: string }) {
  return (
    <label className="field">
      <span>{rotulo}</span>
      {area ? (
        <textarea className="input" value={valor} onChange={(e) => onChange(e.target.value)} style={{ minHeight: 130 }} />
      ) : (
        <input className="input" value={valor} onChange={(e) => onChange(e.target.value)} />
      )}
      {dica && <small>{dica}</small>}
    </label>
  );
}

export function EditorConteudo({ inicial }: { inicial: Conteudo }) {
  const [c, setC] = useState(inicial);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const set = <K extends "hero" | "sobre" | "banner">(sec: K, campo: keyof Conteudo[K], v: string) =>
    setC((x) => ({ ...x, [sec]: { ...x[sec], [campo]: v } }));

  function salvar() {
    iniciar(async () => {
      const r = await salvarConteudo(c);
      setMsg(r.ok ? { ok: true, texto: "Publicado! Já está no site." } : { ok: false, texto: r.erro });
    });
  }

  return (
    <>
      <div className="cartao">
        <h2>Topo da página (banner principal)</h2>
        <p>Título grande, texto e imagem de fundo. Use uma foto horizontal com espaço livre à esquerda para o texto.</p>
        <div className="form-produto">
          <div className="form-grade">
            <Campo rotulo="Título" valor={c.hero.titulo} onChange={(v) => set("hero", "titulo", v)} />
            <Campo rotulo="Título em destaque (itálico)" valor={c.hero.tituloDestaque} onChange={(v) => set("hero", "tituloDestaque", v)} />
            <div className="inteiro">
              <Campo rotulo="Texto" valor={c.hero.subtitulo} onChange={(v) => set("hero", "subtitulo", v)} />
            </div>
            <Campo rotulo="Texto do botão" valor={c.hero.botao} onChange={(v) => set("hero", "botao", v)} />
          </div>
          <UploadImagem valor={c.hero.imagem} onChange={(u) => u && set("hero", "imagem", u)} pasta="site" largo removivel={false} />
        </div>
      </div>

      <div className="cartao">
        <h2>Sobre nós</h2>
        <p>A história da loja. Quebras de linha viram parágrafos.</p>
        <div className="form-produto">
          <div className="form-grade">
            <Campo rotulo="Título" valor={c.sobre.titulo} onChange={(v) => set("sobre", "titulo", v)} />
            <Campo rotulo="Título em destaque (itálico)" valor={c.sobre.tituloDestaque} onChange={(v) => set("sobre", "tituloDestaque", v)} />
            <div className="inteiro">
              <Campo rotulo="Texto" area valor={c.sobre.texto} onChange={(v) => set("sobre", "texto", v)} />
            </div>
          </div>
          <UploadImagem valor={c.sobre.imagem} onChange={(u) => u && set("sobre", "imagem", u)} pasta="site" largo removivel={false} />
        </div>
      </div>

      <div className="cartao">
        <h2>Faixa de entrega</h2>
        <p>Faixa escura com foto de fundo, no meio da página.</p>
        <div className="form-produto">
          <div className="form-grade">
            <Campo rotulo="Título (1ª linha)" valor={c.banner.titulo} onChange={(v) => set("banner", "titulo", v)} />
            <Campo rotulo="2ª linha (em itálico)" valor={c.banner.tituloDestaque} onChange={(v) => set("banner", "tituloDestaque", v)} />
            <div className="inteiro">
              <Campo rotulo="Texto" valor={c.banner.texto} onChange={(v) => set("banner", "texto", v)} />
            </div>
          </div>
          <UploadImagem valor={c.banner.imagem} onChange={(u) => u && set("banner", "imagem", u)} pasta="site" largo removivel={false} />
        </div>
      </div>

      <div className="cartao">
        <h2>Ocasiões</h2>
        <p>Cards de “Flores para cada momento”. Cada um abre o catálogo com a busca indicada.</p>
        <div className="lista-edit">
          {c.ocasioes.map((o, i) => (
            <div key={i} className="lista-edit-item" style={{ gridTemplateColumns: "140px 1fr auto" }}>
              <UploadImagem
                valor={o.imagem}
                onChange={(u) => u && setC((x) => ({ ...x, ocasioes: x.ocasioes.map((y, j) => (j === i ? { ...y, imagem: u } : y)) }))}
                pasta="site"
                removivel={false}
              />
              <div className="form-grade" style={{ alignContent: "start" }}>
                <Campo rotulo="Título" valor={o.titulo} onChange={(v) => setC((x) => ({ ...x, ocasioes: x.ocasioes.map((y, j) => (j === i ? { ...y, titulo: v } : y)) }))} />
                <Campo
                  rotulo="Busca no catálogo"
                  valor={o.busca}
                  dica="Ex.: rosas, girassóis, box"
                  onChange={(v) => setC((x) => ({ ...x, ocasioes: x.ocasioes.map((y, j) => (j === i ? { ...y, busca: v } : y)) }))}
                />
              </div>
              <button type="button" className="btn-icone perigo" onClick={() => setC((x) => ({ ...x, ocasioes: x.ocasioes.filter((_, j) => j !== i) }))} aria-label="Remover ocasião">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ marginTop: 14 }}
          onClick={() => setC((x) => ({ ...x, ocasioes: [...x.ocasioes, { titulo: "Nova ocasião", imagem: "/img/ocasiao-aniversario.jpg", busca: "" }] }))}
        >
          <Plus /> Adicionar ocasião
        </button>
      </div>

      <div className="cartao">
        <h2>Depoimentos</h2>
        <p>Use só depoimentos reais de clientes (ex.: do destaque de feedbacks do Instagram). Sem nenhum, a seção fica escondida.</p>
        <div className="lista-edit">
          {c.depoimentos.map((d, i) => (
            <div key={i} className="lista-edit-item" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="form-grade">
                <Campo rotulo="Nome" valor={d.nome} onChange={(v) => setC((x) => ({ ...x, depoimentos: x.depoimentos.map((y, j) => (j === i ? { ...y, nome: v } : y)) }))} />
                <div className="inteiro">
                  <Campo rotulo="Depoimento" valor={d.texto} onChange={(v) => setC((x) => ({ ...x, depoimentos: x.depoimentos.map((y, j) => (j === i ? { ...y, texto: v } : y)) }))} />
                </div>
              </div>
              <button type="button" className="btn-icone perigo" onClick={() => setC((x) => ({ ...x, depoimentos: x.depoimentos.filter((_, j) => j !== i) }))} aria-label="Remover depoimento">
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => setC((x) => ({ ...x, depoimentos: [...x.depoimentos, { nome: "", texto: "" }] }))}>
          <Plus /> Adicionar depoimento
        </button>
      </div>

      <div className="barra-salvar">
        {msg && <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`}>{msg.texto}</span>}
        <a className="btn btn-outline btn-sm" href="/" target="_blank" rel="noopener">
          <ExternalLink /> Ver site
        </a>
        <button className="btn btn-primary" onClick={salvar} disabled={pendente}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Publicar alterações"}
        </button>
      </div>
    </>
  );
}
