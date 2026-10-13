import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { FormProduto } from "@/components/admin/form-produto";

export const metadata = { title: "Produto" };

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novo = id === "novo";
  if (!novo && !/^\d+$/.test(id)) notFound();
  const [categorias, [produto]] = await Promise.all([
    db.select().from(schema.categorias).orderBy(asc(schema.categorias.ordem)),
    novo ? Promise.resolve([null]) : db.select().from(schema.produtos).where(eq(schema.produtos.id, Number(id))),
  ]);
  if (!novo && !produto) notFound();

  return (
    <>
      <Link href="/admin/produtos" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Produtos
      </Link>
      <div className="adm-topo">
        <h1>{novo ? "Novo produto" : produto!.nome}</h1>
      </div>
      <FormProduto key={produto?.id ?? "novo"} produto={produto ?? null} categorias={categorias} />
    </>
  );
}
