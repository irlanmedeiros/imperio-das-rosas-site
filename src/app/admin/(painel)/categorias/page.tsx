import { asc, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { EditorCategorias } from "@/components/admin/editor-categorias";

export const metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  const [categorias, contagem] = await Promise.all([
    db.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem)),
    db.select({ id: schema.produtos.categoriaId, n: count() }).from(schema.produtos).groupBy(schema.produtos.categoriaId),
  ]);
  const total = Object.fromEntries(contagem.map((c) => [c.id ?? 0, c.n]));
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Categorias</h1>
          <p>Ordem e nomes dos filtros do catálogo e dos cards da página inicial.</p>
        </div>
      </div>
      <EditorCategorias inicial={categorias.map((c) => ({ id: c.id, nome: c.nome, total: total[c.id] ?? 0 }))} />
    </>
  );
}
