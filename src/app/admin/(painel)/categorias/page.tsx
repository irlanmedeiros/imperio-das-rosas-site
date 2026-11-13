import { exigirAdmin } from "@/lib/auth";
import { asc, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { EditorCategorias } from "@/components/admin/editor-categorias";
import { arvoreCategorias } from "@/lib/categorias";

export const metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  await exigirAdmin();
  const [categorias, contagem] = await Promise.all([
    db.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem), asc(schema.categorias.id)),
    db.select({ id: schema.produtos.categoriaId, n: count() }).from(schema.produtos).groupBy(schema.produtos.categoriaId),
  ]);
  const total = Object.fromEntries(contagem.map((c) => [c.id ?? 0, c.n]));
  // cada principal seguida das suas subcategorias (subcategoria órfã vira principal)
  const ordenadas = arvoreCategorias(categorias).flatMap((p) => [{ ...p, paiId: null }, ...p.filhas]);
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Categorias</h1>
          <p>Ordem, nomes e subcategorias dos filtros do catálogo e dos cards da página inicial.</p>
        </div>
      </div>
      <EditorCategorias inicial={ordenadas.map((c) => ({ id: c.id, nome: c.nome, paiId: c.paiId, total: total[c.id] ?? 0 }))} />
    </>
  );
}
