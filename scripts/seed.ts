/**
 * Popula um banco vazio com o catálogo em data/catalogo-inicial.json (categorias + produtos, fotos já no Vercel Blob).
 * Idempotente: categorias são atualizadas pelo slug; produtos já existentes (mesmo slug) não são alterados.
 *
 *   npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";

type Catalogo = {
  categorias: { slug: string; nome: string; ordem: number }[];
  produtos: {
    slug: string;
    nome: string;
    descricao: string | null;
    preco: number;
    precoDe: number | null;
    categoria: string | null;
    foto: string | null;
    ativo: boolean;
    destaque: boolean;
    ordem: number;
  }[];
};

async function main() {
  const { db, schema } = await import("../src/db");
  const cat: Catalogo = JSON.parse(readFileSync("data/catalogo-inicial.json", "utf8"));

  const idCategoria = new Map<string, number>();
  for (const c of cat.categorias) {
    const [row] = await db
      .insert(schema.categorias)
      .values(c)
      .onConflictDoUpdate({ target: schema.categorias.slug, set: { nome: c.nome, ordem: c.ordem } })
      .returning({ id: schema.categorias.id });
    idCategoria.set(c.slug, row.id);
  }

  let novos = 0;
  for (const { categoria, ...p } of cat.produtos) {
    const [existe] = await db.select({ id: schema.produtos.id }).from(schema.produtos).where(eq(schema.produtos.slug, p.slug));
    if (existe) continue;
    await db.insert(schema.produtos).values({ ...p, categoriaId: categoria ? (idCategoria.get(categoria) ?? null) : null });
    novos++;
  }
  console.log(`Pronto: ${cat.categorias.length} categorias, ${novos} produtos novos (${cat.produtos.length - novos} já existiam).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
