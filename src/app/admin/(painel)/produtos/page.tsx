import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { ListaProdutos } from "@/components/admin/lista-produtos";

export const metadata = { title: "Produtos" };

export default async function ProdutosAdmin() {
  const [produtos, categorias] = await Promise.all([
    db.select().from(schema.produtos).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.id)),
    db.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem)),
  ]);
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Produtos</h1>
          <p>
            {produtos.length} cadastrados · {produtos.filter((p) => p.ativo).length} visíveis no site
          </p>
        </div>
        <Link href="/admin/produtos/novo" className="btn btn-primary btn-sm">
          <Plus /> Novo produto
        </Link>
      </div>
      <ListaProdutos produtos={produtos} categorias={categorias} />
    </>
  );
}
