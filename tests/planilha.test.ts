import { describe, expect, it } from "vitest";
import { lerCsv, lerXlsx, paraCsv } from "@/lib/planilha";

/** Monta um .xlsx mínimo (ZIP) — com ou sem compressão — para testar o leitor sem depender do Excel. */
async function montarXlsx(arquivos: Record<string, string>, comprimir: boolean) {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const bruto = enc.encode(conteudo);
    const dados = comprimir
      ? new Uint8Array(await new Response(new Blob([bruto]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer())
      : bruto;
    const n = enc.encode(nome);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, comprimir ? 8 : 0, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, bruto.length, true);
    local.setUint16(26, n.length, true);
    partes.push(new Uint8Array(local.buffer), n, dados);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(10, comprimir ? 8 : 0, true);
    c.setUint32(20, dados.length, true);
    c.setUint32(24, bruto.length, true);
    c.setUint16(28, n.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + dados.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, Object.keys(arquivos).length, true);
  fim.setUint16(10, Object.keys(arquivos).length, true);
  fim.setUint32(12, tamCentral, true);
  fim.setUint32(16, offset, true);
  const tudo = [...partes, ...central, new Uint8Array(fim.buffer)];
  const saida = new Uint8Array(tudo.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of tudo) {
    saida.set(b, p);
    p += b.length;
  }
  return saida;
}

const ARQUIVOS_XLSX = {
  "xl/workbook.xml": '<workbook xmlns:r="r"><sheets><sheet name="Produtos" sheetId="1" r:id="rId7"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId7" Type="x" Target="worksheets/minhaAba.xml"/></Relationships>',
  "xl/sharedStrings.xml":
    "<sst><si><t>Nome</t></si><si><t>Preço</t></si><si><r><t>Buquê </t></r><r><t>&amp; rosas</t></r></si><si><t>Ativo</t></si></sst>",
  "xl/worksheets/minhaAba.xml": `<worksheet><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="s"><v>3</v></c></row>
    <row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3"><v>189.9</v></c><c r="D3" t="b"><v>1</v></c></row>
    <row r="4"><c r="A4" t="inlineStr"><is><t>Caixa &lt;premium&gt;</t></is></c><c r="B4"><f>A1*2</f><v>39.9</v></c></row>
  </sheetData></worksheet>`,
};

describe("lerXlsx", () => {
  it.each([
    ["compactado (como o Excel salva)", true],
    ["sem compressão", false],
  ])("lê a primeira aba %s", async (_, comprimir) => {
    const linhas = await lerXlsx(await montarXlsx(ARQUIVOS_XLSX, comprimir));
    expect(linhas).toEqual([
      ["Nome", "Preço", "", "Ativo"],
      ["Buquê & rosas", "189.9", "", "sim"],
      ["Caixa <premium>", "39.9"],
    ]);
  });
  it("sem workbook usa sheet1.xml", async () => {
    const linhas = await lerXlsx(await montarXlsx({ "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nome</t></is></c></row></sheetData></worksheet>' }, true));
    expect(linhas).toEqual([["Nome"]]);
  });
  it("recusa arquivo que não é xlsx", async () => {
    await expect(lerXlsx(new TextEncoder().encode("isto não é um zip"))).rejects.toThrow(/inválido/);
  });
});

describe("lerCsv", () => {
  it("detecta ponto e vírgula (Excel em português) e ignora o BOM", () => {
    expect(lerCsv("﻿Nome;Preço\r\nBuquê;79,90\r\n")).toEqual([
      ["Nome", "Preço"],
      ["Buquê", "79,90"],
    ]);
  });
  it("detecta vírgula e respeita aspas, aspas duplas e quebra de linha", () => {
    expect(lerCsv('Nome,Descrição\n"Box, flores","Linha 1\nLinha ""2"""\n')).toEqual([
      ["Nome", "Descrição"],
      ["Box, flores", 'Linha 1\nLinha "2"'],
    ]);
  });
  it("aceita tab e descarta linhas vazias", () => {
    expect(lerCsv("Nome\tPreço\n\nRosas\t10\n\t\n")).toEqual([
      ["Nome", "Preço"],
      ["Rosas", "10"],
    ]);
  });
});

describe("paraCsv", () => {
  it("usa ; com BOM e protege campos especiais; o leitor lê de volta igual", () => {
    const linhas = [
      ["Nome", "Descrição"],
      ["Box; flores", 'Diz "te amo"\nem 2 linhas'],
    ];
    const csv = paraCsv(linhas);
    expect(csv.startsWith("﻿Nome;Descrição\r\n")).toBe(true);
    expect(lerCsv(csv)).toEqual(linhas);
  });
});

describe("lerXlsx com prefixo de namespace (Open XML SDK)", () => {
  it("lê <x:row>/<x:c>/<x:si>", async () => {
    const linhas = await lerXlsx(
      await montarXlsx(
        {
          "xl/sharedStrings.xml": "<x:sst><x:si><x:t>Nome</x:t></x:si><x:si><x:t>Rosas</x:t></x:si></x:sst>",
          "xl/worksheets/sheet1.xml": '<x:worksheet><x:sheetData><x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c></x:row><x:row r="2"><x:c r="A2" t="s"><x:v>1</x:v></x:c><x:c r="B2"><x:v>10</x:v></x:c></x:row></x:sheetData></x:worksheet>',
        },
        true,
      ),
    );
    expect(linhas).toEqual([["Nome"], ["Rosas", "10"]]);
  });
});
