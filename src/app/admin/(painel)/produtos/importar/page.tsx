import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/auth";
import { ImportarPlanilha } from "@/components/admin/importar-planilha";

export const metadata = { title: "Importar planilha" };

export default async function ImportarPage() {
  await exigirAdmin();
  const produtos = await db
    .select({
      nome: schema.produtos.nome,
      preco: schema.produtos.preco,
      precoDe: schema.produtos.precoDe,
      categoria: schema.categorias.nome,
      descricao: schema.produtos.descricao,
      foto: schema.produtos.foto,
      ativo: schema.produtos.ativo,
      destaque: schema.produtos.destaque,
    })
    .from(schema.produtos)
    .leftJoin(schema.categorias, eq(schema.produtos.categoriaId, schema.categorias.id))
    .orderBy(asc(schema.produtos.ordem), asc(schema.produtos.id));
  return (
    <>
      <Link href="/admin/produtos" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Produtos
      </Link>
      <div className="adm-topo">
        <div>
          <h1>Importar planilha</h1>
          <p>Cadastre ou atualize vários produtos de uma vez com uma planilha do Excel ou do Google Planilhas.</p>
        </div>
      </div>
      <ImportarPlanilha produtos={produtos} />
    </>
  );
}
