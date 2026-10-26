"use client";

import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importarProdutos, type ResultadoImportacao } from "@/app/admin/(painel)/produtos/importar/actions";
import { brl } from "@/lib/format";
import { chaveProduto, interpretarPlanilha, linhasExportacao, linhasModelo, type ErroLinha, type ProdutoImportado } from "@/lib/importacao";
import { lerArquivoPlanilha, paraCsv } from "@/lib/planilha";

type ProdutoAtual = Parameters<typeof linhasExportacao>[0][number];

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportarPlanilha({ produtos }: { produtos: ProdutoAtual[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [itens, setItens] = useState<ProdutoImportado[]>([]);
  const [erros, setErros] = useState<ErroLinha[]>([]);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [pendente, iniciar] = useTransition();

  const existentes = new Set(produtos.map((p) => chaveProduto(p.nome)));
  const novos = itens.filter((p) => !existentes.has(chaveProduto(p.nome))).length;

  async function escolher(f: File | undefined) {
    if (!f) return;
    setArquivo(f.name);
    setErroArquivo(null);
    setResultado(null);
    setItens([]);
    setErros([]);
    setIgnoradas([]);
    setLendo(true);
    try {
      const r = interpretarPlanilha(await lerArquivoPlanilha(f));
      setItens(r.produtos);
      setErros(r.erros);
      setIgnoradas(r.ignoradas);
    } catch (e) {
      setErroArquivo(e instanceof Error ? e.message : "Não foi possível ler a planilha.");
    } finally {
      setLendo(false);
      if (input.current) input.current.value = "";
    }
  }

  function importar() {
    iniciar(async () => {
      const r = await importarProdutos(itens);
      setResultado(r);
      if (r.ok) setItens([]);
    });
  }

  return (
    <>
      <div className="cartao">
        <h2>1. Prepare a planilha</h2>
        <p>
          Uma linha por produto. Obrigatórios: <strong>Nome</strong> e <strong>Preço</strong>. As outras colunas são opcionais: Preço de (preço riscado),
          Categoria, Descrição, Foto (link da imagem), Ativo e Destaque (sim/não). Produto com o mesmo nome de um já cadastrado é atualizado; os
          demais são criados. Nada é apagado: célula vazia não muda o que já está cadastrado.
        </p>
        <div className="importar-botoes">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => baixar("modelo-produtos.csv", paraCsv(linhasModelo()))}>
            <Download /> Baixar modelo
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => baixar("catalogo-imperio-das-rosas.csv", paraCsv(linhasExportacao(produtos)))}>
            <FileSpreadsheet /> Baixar catálogo atual ({produtos.length})
          </button>
        </div>
        <small className="importar-dica">
          Dica: baixe o catálogo atual, edite no Excel ou no Google Planilhas e importe de volta. Para trocar fotos em massa, use links diretos de
          imagem (terminados em .jpg, .png ou .webp).
        </small>
      </div>

      <div className="cartao">
        <h2>2. Envie a planilha</h2>
        <div
          className="upload largo importar-area"
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            escolher(e.dataTransfer.files[0]);
          }}
          aria-label="Escolher planilha"
        >
          {lendo ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : <Upload />}
          <strong>{arquivo ?? "Toque para escolher a planilha"}</strong>
          <small>Excel (.xlsx) ou CSV</small>
        </div>
        <input ref={input} type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => escolher(e.target.files?.[0])} />
        {erroArquivo && (
          <p className="erro" role="alert" style={{ marginTop: 12 }}>
            {erroArquivo}
          </p>
        )}
      </div>

      {(itens.length > 0 || erros.length > 0) && (
        <div className="cartao">
          <h2>3. Confira e importe</h2>
          <ul className="importar-resumo">
            <li>
              <strong>{novos}</strong> novos
            </li>
            <li>
              <strong>{itens.length - novos}</strong> atualizados
            </li>
            <li className={erros.length ? "com-erro" : undefined}>
              <strong>{erros.length}</strong> com erro (não serão importados)
            </li>
          </ul>
          {ignoradas.length > 0 && <small className="importar-dica">Colunas ignoradas: {ignoradas.join(", ")}.</small>}

          {erros.length > 0 && (
            <ul className="importar-erros" role="alert">
              {erros.slice(0, 50).map((e) => (
                <li key={e.linha}>
                  <TriangleAlert size={15} /> Linha {e.linha}: {e.mensagem}
                </li>
              ))}
              {erros.length > 50 && <li>… e mais {erros.length - 50} linhas com erro.</li>}
            </ul>
          )}

          {itens.length > 0 && (
            <div className="tabela-wrap importar-previa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Produto</th>
                    <th>Preço</th>
                    <th>Categoria</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.slice(0, 100).map((p) => (
                    <tr key={p.linha}>
                      <td>{p.linha}</td>
                      <td>{p.nome}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{brl(p.preco)}</td>
                      <td>{p.categoria ?? "—"}</td>
                      <td>{existentes.has(chaveProduto(p.nome)) ? "Atualiza" : "Novo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {itens.length > 100 && <small className="importar-dica">Mostrando 100 de {itens.length}.</small>}
            </div>
          )}

          <div className="barra-salvar">
            {resultado && !resultado.ok && (
              <span className="msg erro" role="alert">
                {resultado.erro}
              </span>
            )}
            <button className="btn btn-primary" onClick={importar} disabled={pendente || itens.length === 0}>
              {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : `Importar ${itens.length} produto${itens.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {resultado?.ok && (
        <div className="cartao importar-ok" role="status">
          <h2>
            <CheckCircle2 size={18} /> Importação concluída
          </h2>
          <p>
            {resultado.criados} produtos criados e {resultado.atualizados} atualizados
            {resultado.categoriasCriadas.length > 0 && `; categorias novas: ${resultado.categoriasCriadas.join(", ")}`}. O site já mostra as mudanças.
          </p>
          {resultado.avisos.length > 0 && (
            <ul className="importar-erros">
              {resultado.avisos.map((a) => (
                <li key={a}>
                  <TriangleAlert size={15} /> {a}
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/produtos" className="btn btn-outline btn-sm">
            Ver produtos
          </Link>
        </div>
      )}
    </>
  );
}
