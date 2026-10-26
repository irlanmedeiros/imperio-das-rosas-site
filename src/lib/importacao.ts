import { z } from "zod";
import { centavosParaInput, normalizar, parsePreco } from "./format";
import type { Linhas } from "./planilha";

/** Colunas da planilha. O cabeçalho é reconhecido sem acento/maiúscula e aceita alguns sinônimos. */
export const COLUNAS = {
  nome: ["nome", "produto", "nome do produto"],
  preco: ["preco", "valor", "preco (r$)", "preco r$"],
  precoDe: ["preco de", "preco_de", "de", "preco antigo", "preco original"],
  categoria: ["categoria"],
  descricao: ["descricao", "detalhes"],
  foto: ["foto", "imagem", "link da foto", "url da foto"],
  ativo: ["ativo", "no site", "visivel", "mostrar no site"],
  destaque: ["destaque", "em destaque"],
} as const;
export type Campo = keyof typeof COLUNAS;

/** Cabeçalho do modelo e da exportação, na ordem. */
export const CABECALHO: Record<Campo, string> = {
  nome: "Nome",
  preco: "Preço",
  precoDe: "Preço de",
  categoria: "Categoria",
  descricao: "Descrição",
  foto: "Foto",
  ativo: "Ativo",
  destaque: "Destaque",
};

export const MAX_LINHAS = 1000;

/**
 * Uma linha válida. Campo ausente (coluna que não existe ou célula vazia) = não mexe nesse dado do produto
 * já cadastrado; num produto novo, fica vazio/padrão. Assim uma célula esquecida nunca apaga nada.
 */
export type ProdutoImportado = {
  linha: number;
  nome: string;
  preco: number;
  precoDe?: number | null;
  categoria?: string | null;
  descricao?: string | null;
  foto?: string | null;
  ativo?: boolean;
  destaque?: boolean;
};

export type ErroLinha = { linha: number; mensagem: string };

const chaveCabecalho = (s: string) => normalizar(s).replace(/[*:]/g, "").replace(/\s+/g, " ").trim();

/** Descobre em qual coluna está cada campo. */
export function mapearColunas(cabecalho: string[]) {
  const mapa: Partial<Record<Campo, number>> = {};
  const ignoradas: string[] = [];
  cabecalho.forEach((titulo, i) => {
    const k = chaveCabecalho(titulo);
    const campo = (Object.keys(COLUNAS) as Campo[]).find((c) => (COLUNAS[c] as readonly string[]).includes(k));
    if (campo && mapa[campo] === undefined) mapa[campo] = i;
    else if (titulo.trim()) ignoradas.push(titulo.trim());
  });
  return { mapa, ignoradas };
}

/** sim/não, x, 1/0, verdadeiro/falso. Vazio → padrão. */
export function lerSimNao(v: string, padrao: boolean): boolean | null {
  const k = normalizar(v).trim();
  if (!k) return padrao;
  if (["sim", "s", "x", "1", "true", "verdadeiro", "ativo", "yes", "y"].includes(k)) return true;
  if (["nao", "n", "0", "false", "falso", "inativo", "no"].includes(k)) return false;
  return null;
}

const urlFoto = z.string().url().refine((u) => /^https?:\/\//i.test(u), "Use um link que comece com http:// ou https://");

/**
 * Transforma as linhas da planilha em produtos. Linhas com problema vão para `erros` (com o número da
 * linha como aparece no Excel) e não entram na importação; as demais seguem normalmente.
 */
export function interpretarPlanilha(linhas: Linhas) {
  const erros: ErroLinha[] = [];
  const produtos: ProdutoImportado[] = [];
  if (linhas.length < 2) return { produtos, erros: [{ linha: 1, mensagem: "A planilha está vazia: precisa do cabeçalho e de pelo menos um produto." }], ignoradas: [] as string[] };

  const { mapa, ignoradas } = mapearColunas(linhas[0]);
  const faltando = (["nome", "preco"] as const).filter((c) => mapa[c] === undefined);
  if (faltando.length) {
    return {
      produtos,
      erros: [{ linha: 1, mensagem: `Faltam as colunas obrigatórias: ${faltando.map((c) => CABECALHO[c]).join(" e ")}. Use o modelo para conferir os nomes.` }],
      ignoradas,
    };
  }
  if (linhas.length - 1 > MAX_LINHAS) {
    return { produtos, erros: [{ linha: 1, mensagem: `Máximo de ${MAX_LINHAS} produtos por planilha (esta tem ${linhas.length - 1}).` }], ignoradas };
  }

  const vistos = new Map<string, number>();
  linhas.slice(1).forEach((l, i) => {
    const linha = i + 2;
    const cel = (c: Campo) => (mapa[c] === undefined ? undefined : (l[mapa[c]!] ?? "").trim());
    const problemas: string[] = [];

    const nome = cel("nome") ?? "";
    if (nome.length < 2) problemas.push("nome vazio ou muito curto");
    if (nome.length > 120) problemas.push("nome com mais de 120 caracteres");

    const preco = parsePreco(cel("preco") ?? "");
    if (!preco || preco < 1) problemas.push("preço vazio ou inválido");

    const p: ProdutoImportado = { linha, nome, preco: preco ?? 0 };

    const de = cel("precoDe");
    if (de) {
      const v = parsePreco(de);
      if (v == null) problemas.push("“preço de” inválido");
      else p.precoDe = preco && v > preco ? v : null; // “de” só faz sentido se for maior que o preço
    }

    const categoria = cel("categoria");
    if (categoria) p.categoria = categoria.slice(0, 60);

    const descricao = cel("descricao");
    if (descricao) {
      if (descricao.length > 2000) problemas.push("descrição com mais de 2000 caracteres");
      p.descricao = descricao;
    }

    const foto = cel("foto");
    if (foto) {
      if (!urlFoto.safeParse(foto).success) problemas.push("link da foto inválido");
      p.foto = foto;
    }

    for (const campo of ["ativo", "destaque"] as const) {
      const v = cel(campo);
      if (!v) continue;
      const b = lerSimNao(v, campo === "ativo");
      if (b === null) problemas.push(`“${CABECALHO[campo]}” deve ser sim ou não`);
      else p[campo] = b;
    }

    const chave = normalizar(nome).trim();
    if (chave && vistos.has(chave)) problemas.push(`nome repetido (já aparece na linha ${vistos.get(chave)})`);
    else if (chave) vistos.set(chave, linha);

    if (problemas.length) erros.push({ linha, mensagem: problemas.join("; ") });
    else produtos.push(p);
  });
  return { produtos, erros, ignoradas };
}

/** Chave para casar a linha da planilha com um produto já cadastrado (nome sem acento/caixa). */
export const chaveProduto = (nome: string) => normalizar(nome).replace(/\s+/g, " ").trim();

/** Linhas do modelo para baixar (cabeçalho + 2 exemplos). */
export function linhasModelo() {
  return [
    Object.values(CABECALHO),
    ["Buquê 12 rosas vermelhas", "189,90", "219,90", "Buquês & Ramalhetes", "12 rosas vermelhas com folhagem e papel kraft.", "", "sim", "sim"],
    ["Caixa de bombons", "39,90", "", "Chocolates", "", "", "sim", "não"],
  ];
}

type ProdutoExportado = { nome: string; preco: number; precoDe: number | null; categoria: string | null; descricao: string | null; foto: string | null; ativo: boolean; destaque: boolean };

/** Catálogo atual no mesmo formato do modelo (para editar e importar de volta). */
export function linhasExportacao(produtos: ProdutoExportado[]) {
  return [
    Object.values(CABECALHO),
    ...produtos.map((p) => [
      p.nome,
      centavosParaInput(p.preco),
      centavosParaInput(p.precoDe),
      p.categoria ?? "",
      p.descricao ?? "",
      p.foto ?? "",
      p.ativo ? "sim" : "não",
      p.destaque ? "sim" : "não",
    ]),
  ];
}
