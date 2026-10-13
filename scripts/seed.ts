/**
 * Importa o catálogo do cliente (gerado no cofre Obsidian) para o banco e envia as fotos ao Vercel Blob.
 * Idempotente: produtos já existentes (mesmo slug) são mantidos como estão.
 *
 *   npx tsx scripts/seed.ts "<caminho>/IMPÉRIO FLORICULTURA/Site"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";

type ProdutoCatalogo = { id: string; nome: string; cat: string; preco: number; de?: number; foto?: string };
type Catalogo = { categorias: { id: string; nome: string }[]; produtos: ProdutoCatalogo[] };

const DESTAQUES = [
  "4-rosas-vermelhas", "ramalhete-pink", "mix-amor-real", "ramalhete-10-girassois", "ramalhete-oceano", "lirios-roxo",
  "buque-100-rosas", "ramalhete-lirios-azuis", "van-gogh-noite-estrelada", "ramalhete-doce-amor", "lirios-hortensias",
  "ramalhete-laranja", "combo-buque-pelucia-ferrero", "combo-azul", "box-premium", "box-girassois",
];

async function main() {
  const { db, schema } = await import("../src/db");
  const siteDir = process.argv[2];
  if (!siteDir) throw new Error("Informe a pasta Site/ do cofre");
  const js = readFileSync(path.join(siteDir, "catalogo.js"), "utf8");
  const cat: Catalogo = JSON.parse(js.slice(js.indexOf("{"), js.lastIndexOf("}") + 1));

  // Categorias
  const idCategoria = new Map<string, number>();
  for (const [i, c] of cat.categorias.entries()) {
    const [row] = await db
      .insert(schema.categorias)
      .values({ slug: c.id, nome: c.nome, ordem: i })
      .onConflictDoUpdate({ target: schema.categorias.slug, set: { nome: c.nome, ordem: i } })
      .returning();
    idCategoria.set(c.id, row.id);
  }

  // Produtos
  let novos = 0;
  for (const [i, p] of cat.produtos.entries()) {
    const [existe] = await db.select({ id: schema.produtos.id }).from(schema.produtos).where(eq(schema.produtos.slug, p.id));
    if (existe) continue;
    let foto: string | null = null;
    const arquivo = p.foto && path.join(siteDir, p.foto);
    if (arquivo && existsSync(arquivo)) {
      const blob = await put(`produtos/${p.id}.jpg`, readFileSync(arquivo), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/jpeg",
      });
      foto = blob.url;
    }
    await db.insert(schema.produtos).values({
      slug: p.id,
      nome: p.nome,
      preco: Math.round(p.preco * 100),
      precoDe: p.de ? Math.round(p.de * 100) : null,
      categoriaId: idCategoria.get(p.cat) ?? null,
      foto,
      destaque: DESTAQUES.includes(p.id),
      ordem: i,
    });
    novos++;
    process.stdout.write(`\r${novos} produtos importados`);
  }
  console.log(`\nPronto: ${novos} novos, ${cat.produtos.length - novos} já existiam.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
