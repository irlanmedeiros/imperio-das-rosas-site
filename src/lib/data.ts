import "server-only";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { CONTEUDO_PADRAO, LOJA_PADRAO, conteudoSchema, lojaSchema, type Conteudo, type Loja } from "./config-types";

/** Tag única das páginas públicas: qualquer alteração no admin chama updateTag(TAG_LOJA). */
export const TAG_LOJA = "loja";
/** Mude ao alterar os textos padrão ou o formato dos dados: o cache da Vercel sobrevive entre deploys. */
const VERSAO_CACHE = "2026-10-13c";

export type ProdutoPublico = {
  id: number;
  slug: string;
  nome: string;
  descricao: string | null;
  preco: number;
  precoDe: number | null;
  foto: string | null;
  destaque: boolean;
  categoria: string | null;
};

export type CategoriaPublica = { slug: string; nome: string; total: number; foto: string | null };

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
    const cats = await db.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem), asc(schema.categorias.id));
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

    const slugPorId = new Map(cats.map((c) => [c.id, c.slug]));
    const produtos: ProdutoPublico[] = rows.map(({ categoriaId, ...p }) => ({
      ...p,
      categoria: categoriaId ? (slugPorId.get(categoriaId) ?? null) : null,
    }));
    const categorias: CategoriaPublica[] = cats
      .map((c) => {
        const daCat = produtos.filter((p) => p.categoria === c.slug);
        return { slug: c.slug, nome: c.nome, total: daCat.length, foto: daCat.find((p) => p.foto)?.foto ?? null };
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
  const relacionados = produtos
    .filter((p) => p.categoria === produto.categoria && p.id !== produto.id)
    .slice(0, 8);
  const categoria = categorias.find((c) => c.slug === produto.categoria) ?? null;
  return { produto, relacionados, categoria };
}
