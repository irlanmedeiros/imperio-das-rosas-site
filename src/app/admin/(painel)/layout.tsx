import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/auth";
import { LateralAdmin } from "@/components/admin/lateral";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  const [{ novos }] = await db.select({ novos: count() }).from(schema.pedidos).where(eq(schema.pedidos.status, "novo"));
  return (
    <div className="adm">
      <LateralAdmin pedidosNovos={novos} />
      <main className="adm-principal">{children}</main>
    </div>
  );
}
