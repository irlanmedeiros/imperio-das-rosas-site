"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/auth";
import { TAG_LOJA } from "@/lib/data";
import { slugify } from "@/lib/format";
import { copiarFotoDeLink, fotoJaHospedada } from "@/lib/fotos";
import { chaveProduto, MAX_LINHAS, type ProdutoImportado } from "@/lib/importacao";

export type ResultadoImportacao =
  | { ok: true; criados: number; atualizados: number; categoriasCriadas: string[]; avisos: string[] }
  | { ok: false; erro: string };

const MAX_FOTOS_POR_IMPORTACAO = 60;

const itemSchema = z.object({
  linha: z.number().int(),
  nome: z.string().trim().min(2).max(120),
  preco: z.number().int().min(1),
  precoDe: z.number().int().min(0).nullable().optional(),
  categoria: z.string().trim().max(120).nullable().optional(),
  descricao: z.string().trim().max(2000).nullable().optional(),
  foto: z.string().url().nullable().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
});

/** Cria os produtos novos e atualiza os que já existem (mesmo nome). Não apaga nada. */
export async function importarProdutos(itens: ProdutoImportado[]): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const r = z.array(itemSchema).min(1, "Nenhum produto para importar.").max(MAX_LINHAS).safeParse(itens);
  if (!r.success) return { ok: false, erro: `Planilha inválida: ${r.error.issues[0].message}` };
  const lista = r.data;
  const avisos: string[] = [];

  const [existentes, categorias, [{ ultima }]] = await Promise.all([
    db.select({ id: schema.produtos.id, nome: schema.produtos.nome, slug: schema.produtos.slug, foto: schema.produtos.foto }).from(schema.produtos),
    db.select({ id: schema.categorias.id, nome: schema.categorias.nome, slug: schema.categorias.slug, ordem: schema.categorias.ordem, paiId: schema.categorias.paiId }).from(schema.categorias),
    db.select({ ultima: max(schema.produtos.ordem) }).from(schema.produtos),
  ]);

  // categorias: casa pelo nome (sem acento/caixa) ou slug; cria as que faltam no fim da lista.
  // "Buquês > Rosas" = subcategoria Rosas dentro de Buquês (as duas são criadas se faltarem).
  const categoriasCriadas: string[] = [];
  const slugsCat = new Set(categorias.map((c) => c.slug));
  const principais = new Map<string, number>(); // chave do nome → id
  const filhas = new Map<string, number>(); // "id do pai>chave do nome" → id
  for (const c of categorias) {
    if (c.paiId) filhas.set(`${c.paiId}>${chaveProduto(c.nome)}`, c.id);
    else {
      principais.set(chaveProduto(c.nome), c.id);
      principais.set(c.slug, c.id);
    }
  }
  const qualquer = new Map(categorias.map((c) => [chaveProduto(c.nome), c.id])); // nome sozinho de uma subcategoria
  for (const c of categorias) qualquer.set(c.slug, c.id);
  let ordemCat = Math.max(-1, ...categorias.map((c) => c.ordem));
  const criar = async (nome: string, paiId: number | null) => {
    let slug = slugify(nome) || "categoria";
    for (let i = 2; slugsCat.has(slug); i++) slug = `${slugify(nome) || "categoria"}-${i}`;
    slugsCat.add(slug);
    const [nova] = await db.insert(schema.categorias).values({ nome, slug, ordem: ++ordemCat, paiId }).returning({ id: schema.categorias.id });
    return nova.id;
  };
  const cache = new Map<string, number>();
  const idCategoriaOuCria = async (texto: string): Promise<number> => {
    const chave = chaveProduto(texto);
    if (cache.has(chave)) return cache.get(chave)!;
    const [paiNome, filhoNome] = texto.split(/\s*[>›]\s*/).map((t) => t.trim()).filter(Boolean);
    let id: number;
    if (filhoNome) {
      let paiId = principais.get(chaveProduto(paiNome)) ?? principais.get(slugify(paiNome));
      if (!paiId) {
        paiId = await criar(paiNome, null);
        principais.set(chaveProduto(paiNome), paiId);
        categoriasCriadas.push(paiNome);
      }
      const k = `${paiId}>${chaveProduto(filhoNome)}`;
      id = filhas.get(k) ?? 0;
      if (!id) {
        id = await criar(filhoNome, paiId);
        filhas.set(k, id);
        categoriasCriadas.push(`${paiNome} > ${filhoNome}`);
      }
    } else {
      id = principais.get(chave) ?? qualquer.get(chave) ?? qualquer.get(slugify(paiNome ?? texto)) ?? 0;
      if (!id) {
        id = await criar(paiNome ?? texto, null);
        principais.set(chave, id);
        categoriasCriadas.push(paiNome ?? texto);
      }
    }
    cache.set(chave, id);
    return id;
  };
  const idPorTexto = new Map<string, number>();
  for (const nome of new Set(lista.map((p) => p.categoria).filter((c): c is string => !!c))) idPorTexto.set(nome, await idCategoriaOuCria(nome));
  const idCategoria = (nome: string | null | undefined) => (nome ? (idPorTexto.get(nome) ?? null) : null);

  const existentePorChave = new Map(existentes.map((p) => [chaveProduto(p.nome), p]));
  const slugsUsados = new Set(existentes.map((p) => p.slug));
  const slugNovo = (nome: string) => {
    const base = slugify(nome) || "produto";
    let slug = base;
    for (let i = 2; slugsUsados.has(slug); i++) slug = `${base}-${i}`;
    slugsUsados.add(slug);
    return slug;
  };

  let fotosCopiadas = 0;
  let criados = 0;
  let atualizados = 0;
  let ordem = ultima ?? 0;
  const novos: (typeof schema.produtos.$inferInsert)[] = [];

  for (const p of lista) {
    const atual = existentePorChave.get(chaveProduto(p.nome));

    // foto: links do próprio site ficam como estão; outros são copiados para o R2
    let foto = p.foto;
    if (foto && !fotoJaHospedada(foto) && foto !== atual?.foto) {
      if (fotosCopiadas >= MAX_FOTOS_POR_IMPORTACAO) {
        avisos.push(`Linha ${p.linha} (${p.nome}): foto não copiada — limite de ${MAX_FOTOS_POR_IMPORTACAO} fotos por importação. Importe de novo para continuar.`);
        foto = undefined;
      } else {
        try {
          foto = await copiarFotoDeLink(foto, p.nome);
          fotosCopiadas++;
        } catch (e) {
          avisos.push(`Linha ${p.linha} (${p.nome}): foto não copiada — ${e instanceof Error ? e.message : "erro ao baixar"}.`);
          foto = undefined;
        }
      }
    }

    // só os campos que vieram na planilha; os ausentes ficam como estão
    const campos = {
      nome: p.nome,
      preco: p.preco,
      ...(p.precoDe !== undefined && { precoDe: p.precoDe }),
      ...(p.categoria !== undefined && { categoriaId: idCategoria(p.categoria) }),
      ...(p.descricao !== undefined && { descricao: p.descricao }),
      ...(foto !== undefined && { foto }),
      ...(p.ativo !== undefined && { ativo: p.ativo }),
      ...(p.destaque !== undefined && { destaque: p.destaque }),
    };

    if (atual) {
      await db.update(schema.produtos).set({ ...campos, atualizadoEm: new Date() }).where(eq(schema.produtos.id, atual.id));
      atualizados++;
    } else {
      novos.push({ ativo: true, destaque: false, ...campos, slug: slugNovo(p.nome), ordem: ++ordem });
      criados++;
    }
  }
  for (let i = 0; i < novos.length; i += 100) await db.insert(schema.produtos).values(novos.slice(i, i + 100));

  // mesmo efeito de salvar no painel: site atualizado na próxima visita
  updateTag(TAG_LOJA);
  revalidatePath("/", "layout");
  return { ok: true, criados, atualizados, categoriasCriadas, avisos };
}
