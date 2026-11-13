import "server-only";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { garantirEsquema } from "@/db/esquema";
import { arvoreCategorias } from "./categorias";
import { CONTEUDO_PADRAO, LOJA_PADRAO, conteudoSchema, lojaSchema, type Conteudo, type Loja } from "./config-types";

/** Tag única das páginas públicas: qualquer alteração no admin chama updateTag(TAG_LOJA). */
export const TAG_LOJA = "loja";
/** Mude ao alterar os textos padrão ou o formato dos dados: o cache da Vercel sobrevive entre deploys. */
const VERSAO_CACHE = "2026-11-13a";

export type ProdutoPublico = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  preco: number;
  precoDe: number | null;
  foto: string | null;
  destaque: boolean;
  /** Slug da categoria principal (ex.: "buques") */
  categoria: string | null;
  /** Slug da subcategoria (ex.: "rosas"), quando o produto está numa */
  subcategoria: string | null;
};

export type SubcategoriaPublica = { slug: string; nome: string; total: number };
/** Só as categorias principais; `total` inclui os produtos das subcategorias. */
export type CategoriaPublica = { slug: string; nome: string; total: number; foto: string | null; subs: SubcategoriaPublica[] };

export async function lerConfig<T>(chave: "loja" | "conteudo"): Promise<T> {
  const [row] = await db.select().from(schema.configuracoes).where(eq(schema.configuracoes.chave, chave));
  if (chave === "loja") {
    const r = lojaSchema.safeParse({ ...LOJA_PADRAO, ...((row?.valor as object) ?? {}) });
    return (r.success ? r.data : LOJA_PADRAO) as T;
  }
  const r = conteudoSchema.safeParse({ ...CONTEUDO_PADRAO, ...((row?.valor as object) ?? {}) });
  return (r.success ? r.data : CONTEUDO_PADRAO) as T;
}

/**
 * Build sem DATABASE_URL (build automático da Cloudflare): a página vira dinâmica e busca os dados
 * quando o site está no ar, onde o banco existe. Com DATABASE_URL, as páginas continuam estáticas.
 */
export async function semBancoNoBuild() {
  if (!process.env.DATABASE_URL) await connection();
}

const lojaEmCache = unstable_cache(() => lerConfig<Loja>("loja"), ["loja", VERSAO_CACHE], { tags: [TAG_LOJA] });
const conteudoEmCache = unstable_cache(() => lerConfig<Conteudo>("conteudo"), ["conteudo", VERSAO_CACHE], { tags: [TAG_LOJA] });

export async function getLoja() {
  await semBancoNoBuild();
  return lojaEmCache();
}

export async function getConteudo() {
  await semBancoNoBuild();
  return conteudoEmCache();
}

export async function getCatalogo() {
  await semBancoNoBuild();
  return catalogoEmCache();
}

const catalogoEmCache = unstable_cache(
  async () => {
    await garantirEsquema();
    const cats = await db.select().from(schema.categorias);
    const rows = await db
      .select({
        id: schema.produtos.id,
        slug: schema.produtos.slug,
        nome: schema.produtos.nome,
        descricao: schema.produtos.descricao,
        preco: schema.produtos.preco,
        precoDe: schema.produtos.precoDe,
        foto: schema.produtos.foto,
        destaque: schema.produtos.destaque,
        categoriaId: schema.produtos.categoriaId,
      })
      .from(schema.produtos)
      .where(eq(schema.produtos.ativo, true))
      .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.id));

    const arvore = arvoreCategorias(cats);
    // id de qualquer categoria → [slug da principal, slug da subcategoria]
    const destino = new Map<number, [string, string | null]>();
    for (const p of arvore) {
      destino.set(p.id, [p.slug, null]);
      for (const f of p.filhas) destino.set(f.id, [p.slug, f.slug]);
    }
    const produtos: ProdutoPublico[] = rows.map(({ categoriaId, ...p }) => {
      const [categoria, subcategoria] = (categoriaId && destino.get(categoriaId)) || [null, null];
      return { ...p, categoria, subcategoria };
    });
    const categorias: CategoriaPublica[] = arvore
      .map((c) => {
        const daCat = produtos.filter((p) => p.categoria === c.slug);
        const subs = c.filhas
          .map((f) => ({ slug: f.slug, nome: f.nome, total: daCat.filter((p) => p.subcategoria === f.slug).length }))
          .filter((f) => f.total > 0);
        return { slug: c.slug, nome: c.nome, total: daCat.length, foto: daCat.find((p) => p.foto)?.foto ?? null, subs };
      })
      .filter((c) => c.total > 0);
    return { produtos, categorias };
  },
  ["catalogo", VERSAO_CACHE],
  { tags: [TAG_LOJA] },
);

export async function getProduto(slug: string) {
  const { produtos, categorias } = await getCatalogo();
  const produto = produtos.find((p) => p.slug === slug);
  if (!produto) return null;
  // primeiro os da mesma subcategoria, depois o resto da categoria
  const mesmaCat = produtos.filter((p) => p.categoria === produto.categoria && p.id !== produto.id);
  const relacionados = [
    ...mesmaCat.filter((p) => produto.subcategoria && p.subcategoria === produto.subcategoria),
    ...mesmaCat.filter((p) => !produto.subcategoria || p.subcategoria !== produto.subcategoria),
  ].slice(0, 8);
  const categoria = categorias.find((c) => c.slug === produto.categoria) ?? null;
  const subcategoria = categoria?.subs.find((s) => s.slug === produto.subcategoria) ?? null;
  return { produto, relacionados, categoria, subcategoria };
}
