import { count, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/auth";
import { LateralAdmin } from "@/components/admin/lateral";
import { STATUS_A_ATENDER } from "@/lib/status";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const eu = await exigirAdmin();
  const [{ novos }] = await db.select({ novos: count() }).from(schema.pedidos).where(inArray(schema.pedidos.status, STATUS_A_ATENDER));
  return (
    <div className="adm">
      <LateralAdmin pedidosNovos={novos} nome={eu.nome} dono={eu.papel === "dono"} />
      <main className="adm-principal">{children}</main>
    </div>
  );
}
