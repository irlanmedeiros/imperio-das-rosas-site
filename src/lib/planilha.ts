/**
 * Leitura de planilhas sem dependências: CSV (vírgula, ponto e vírgula ou tab) e Excel .xlsx.
 * O .xlsx é um ZIP com XML dentro; descompactamos com DecompressionStream (navegadores atuais e Node 18+).
 * Resultado: linhas de texto, a primeira é o cabeçalho.
 */

export type Linhas = string[][];

/* ---------------- CSV ---------------- */

function detectarSeparador(primeiraLinha: string) {
  const conta = (c: string) => primeiraLinha.split(c).length - 1;
  const candidatos = [";", ",", "\t"].map((c) => [c, conta(c)] as const).sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ",";
}

/** CSV no padrão RFC 4180 (aspas, aspas duplicadas, quebra de linha dentro de aspas). */
export function lerCsv(texto: string): Linhas {
  const t = texto.replace(/^﻿/, "");
  const sep = detectarSeparador(t.split(/\r?\n/, 1)[0] ?? "");
  const linhas: Linhas = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return limpar(linhas);
}

/** Gera CSV com ";" e BOM (o Excel em português abre direto, com acentos certos). */
export function paraCsv(linhas: (string | number | boolean | null | undefined)[][]): string {
  const cel = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
}

/* ---------------- XLSX ---------------- */

type EntradaZip = { metodo: number; tamanhoCompactado: number; inicioLocal: number };

function lerZip(bytes: Uint8Array): Map<string, EntradaZip> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // fim do diretório central: assinatura 0x06054b50, procurada de trás para frente
  let fim = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("Arquivo .xlsx inválido ou corrompido.");
  const total = dv.getUint16(fim + 10, true);
  let p = dv.getUint32(fim + 16, true);
  const decoder = new TextDecoder();
  const entradas = new Map<string, EntradaZip>();
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Arquivo .xlsx inválido ou corrompido.");
    const metodo = dv.getUint16(p + 10, true);
    const tamanhoCompactado = dv.getUint32(p + 20, true);
    const tamNome = dv.getUint16(p + 28, true);
    const tamExtra = dv.getUint16(p + 30, true);
    const tamComent = dv.getUint16(p + 32, true);
    const inicioLocal = dv.getUint32(p + 42, true);
    const nome = decoder.decode(bytes.subarray(p + 46, p + 46 + tamNome));
    entradas.set(nome, { metodo, tamanhoCompactado, inicioLocal });
    p += 46 + tamNome + tamExtra + tamComent;
  }
  return entradas;
}

async function extrair(bytes: Uint8Array, e: EntradaZip): Promise<string> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const inicio = e.inicioLocal + 30 + dv.getUint16(e.inicioLocal + 26, true) + dv.getUint16(e.inicioLocal + 28, true);
  const dados = bytes.subarray(inicio, inicio + e.tamanhoCompactado);
  if (e.metodo === 0) return new TextDecoder().decode(dados);
  if (e.metodo !== 8) throw new Error("Formato de compressão do .xlsx não suportado.");
  const fluxo = new Blob([dados.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(fluxo).text();
}

function decodificarXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** Junta todos os <t> de um trecho (texto com formatação vem quebrado em vários <t>). */
function textos(xml: string) {
  return [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>|<(?:\w+:)?t\s*\/>/g)].map((m) => decodificarXml(m[1] ?? "")).join("");
}

function colunaParaIndice(ref: string) {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Primeira aba de um .xlsx (Excel, Google Planilhas, LibreOffice) como linhas de texto. */
export async function lerXlsx(dados: ArrayBuffer | Uint8Array): Promise<Linhas> {
  const bytes = dados instanceof Uint8Array ? dados : new Uint8Array(dados);
  const zip = lerZip(bytes);
  const ler = async (nome: string) => {
    const e = zip.get(nome);
    return e ? extrair(bytes, e) : null;
  };

  // caminho da primeira aba: workbook.xml → relationship → arquivo
  let caminho = "xl/worksheets/sheet1.xml";
  const workbook = await ler("xl/workbook.xml");
  const rels = await ler("xl/_rels/workbook.xml.rels");
  const rid = workbook?.match(/<(?:\w+:)?sheet\b[^>]*\b\w+:id="([^"]+)"/)?.[1];
  if (rid && rels) {
    const alvo = [...rels.matchAll(/<(?:\w+:)?Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`))?.match(/Target="([^"]+)"/)?.[1];
    if (alvo) caminho = alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo}`;
  }
  const aba = await ler(caminho);
  if (!aba) throw new Error("Não encontrei nenhuma aba na planilha.");

  const compartilhadas = [...((await ler("xl/sharedStrings.xml")) ?? "").matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => textos(m[1]));

  const linhas: Linhas = [];
  for (const mLinha of aba.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const numLinha = Number(mLinha[1].match(/\br="(\d+)"/)?.[1] ?? linhas.length + 1);
    const linha: string[] = [];
    let proxima = 0;
    for (const mCel of mLinha[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attrs = mCel[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const col = ref ? colunaParaIndice(ref) : proxima;
      proxima = col + 1;
      const tipo = attrs.match(/\bt="([^"]+)"/)?.[1];
      const interno = mCel[2] ?? "";
      const v = interno.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let valor = "";
      if (tipo === "s") valor = compartilhadas[Number(v)] ?? "";
      else if (tipo === "inlineStr") valor = textos(interno);
      else if (tipo === "b") valor = v === "1" ? "sim" : "não";
      else if (v != null) valor = decodificarXml(v);
      linha[col] = valor;
    }
    linhas[numLinha - 1] = Array.from(linha, (c) => c ?? "");
  }
  return limpar(Array.from(linhas, (l) => l ?? []));
}

/** Tira espaços nas pontas e descarta linhas totalmente vazias. */
function limpar(linhas: Linhas): Linhas {
  return linhas.map((l) => l.map((c) => (c ?? "").trim())).filter((l) => l.some((c) => c !== ""));
}

/** Lê o arquivo escolhido pelo usuário (.xlsx ou .csv). */
export async function lerArquivoPlanilha(arquivo: File): Promise<Linhas> {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".xlsx")) return lerXlsx(await arquivo.arrayBuffer());
  if (nome.endsWith(".csv") || nome.endsWith(".txt")) return lerCsv(await arquivo.text());
  if (nome.endsWith(".xls")) throw new Error("Formato .xls antigo: no Excel, use Arquivo → Salvar como → Pasta de Trabalho do Excel (.xlsx).");
  throw new Error("Use uma planilha .xlsx (Excel/Google Planilhas) ou .csv.");
}
