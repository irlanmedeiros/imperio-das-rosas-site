"use client";

import { ExternalLink, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { excluirProduto, salvarProduto } from "@/app/admin/actions";
import type { Categoria, Produto } from "@/db/schema";
import { centavosParaInput, parsePreco } from "@/lib/format";
import { UploadImagem } from "./upload-imagem";

export function FormProduto({ produto, categorias }: { produto: Produto | null; categorias: Categoria[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [f, setF] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    preco: centavosParaInput(produto?.preco),
    precoDe: centavosParaInput(produto?.precoDe),
    categoriaId: produto?.categoriaId ? String(produto.categoriaId) : (categorias[0]?.id ? String(categorias[0].id) : ""),
    foto: produto?.foto ?? null,
    ativo: produto?.ativo ?? true,
    destaque: produto?.destaque ?? false,
  });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const preco = parsePreco(f.preco);
    if (!preco) return setMsg({ ok: false, texto: "Informe um preço válido, ex.: 189,90" });
    iniciar(async () => {
      const r = await salvarProduto(produto?.id ?? null, {
        nome: f.nome,
        descricao: f.descricao,
        preco,
        precoDe: parsePreco(f.precoDe),
        categoriaId: f.categoriaId ? Number(f.categoriaId) : null,
        foto: f.foto,
        ativo: f.ativo,
        destaque: f.destaque,
      });
      if (!r.ok) return setMsg({ ok: false, texto: r.erro });
      setMsg({ ok: true, texto: "Salvo! Já está no site." });
      if (!produto && r.id) router.replace(`/admin/produtos/${r.id}`);
      else router.refresh();
    });
  }

  function excluir() {
    if (!produto || !confirm(`Excluir "${produto.nome}" de vez? Se for só tirar do site por um tempo, use "Mostrar no site".`)) return;
    iniciar(async () => {
      await excluirProduto(produto.id);
      router.push("/admin/produtos");
    });
  }

  return (
    <form onSubmit={salvar}>
      <div className="form-produto">
        <div>
          <div className="cartao">
            <h2>Informações</h2>
            <p>Nome, preço e categoria aparecem no card e na página do produto.</p>
            <div className="form-grade">
              <label className="field inteiro">
                <span>Nome</span>
                <input className="input" required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Ramalhete pink" />
              </label>
              <label className="field">
                <span>Preço (R$)</span>
                <input className="input" inputMode="decimal" required value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} placeholder="189,90" />
              </label>
              <label className="field">
                <span>Preço “de” (opcional)</span>
                <input className="input" inputMode="decimal" value={f.precoDe} onChange={(e) => setF({ ...f, precoDe: e.target.value })} placeholder="Ex.: 249,90" />
                <small>Preencha para mostrar como promoção, com o valor riscado.</small>
              </label>
              <label className="field inteiro">
                <span>Categoria</span>
                <select className="input" value={f.categoriaId} onChange={(e) => setF({ ...f, categoriaId: e.target.value })}>
                  <option value="">Sem categoria</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field inteiro">
                <span>Descrição (opcional)</span>
                <textarea
                  className="input"
                  value={f.descricao}
                  onChange={(e) => setF({ ...f, descricao: e.target.value })}
                  placeholder="Ex.: 12 rosas vermelhas colombianas com eucalipto, embrulhadas em papel kraft com laço de cetim."
                  style={{ minHeight: 120 }}
                />
              </label>
            </div>
          </div>
          <div className="cartao">
            <h2>Visibilidade</h2>
            <div className="linha-switch">
              <div>
                <strong>Mostrar no site</strong>
                <small>Desligue para esconder sem excluir (ex.: em falta).</small>
              </div>
              <label className="switch">
                <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
                <span />
              </label>
            </div>
            <div className="linha-switch">
              <div>
                <strong>Destaque na página inicial</strong>
                <small>Buquês vão para o 1º carrossel; box, combos e mimos para o 2º.</small>
              </div>
              <label className="switch">
                <input type="checkbox" checked={f.destaque} onChange={(e) => setF({ ...f, destaque: e.target.checked })} />
                <span />
              </label>
            </div>
          </div>
        </div>
        <div className="cartao">
          <h2>Foto</h2>
          <p>Use foto vertical, com o arranjo centralizado.</p>
          <UploadImagem valor={f.foto} onChange={(foto) => setF({ ...f, foto })} />
        </div>
      </div>
      <div className="barra-salvar">
        {msg && <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`}>{msg.texto}</span>}
        {produto && (
          <>
            <Link className="btn btn-outline btn-sm" href={`/produto/${produto.slug}`} target="_blank">
              <ExternalLink /> Ver no site
            </Link>
            <button type="button" className="btn btn-perigo btn-sm" onClick={excluir} disabled={pendente}>
              <Trash2 /> Excluir
            </button>
          </>
        )}
        <button className="btn btn-primary" disabled={pendente}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : produto ? "Salvar alterações" : "Criar produto"}
        </button>
      </div>
    </form>
  );
}
