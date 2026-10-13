import { exigirAdmin } from "@/lib/auth";
import { and, count, desc, eq, gte, ne, sum } from "drizzle-orm";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { db, schema } from "@/db";
import { TabelaPedidos } from "@/components/admin/tabela-pedidos";
import { brl } from "@/lib/format";

export const metadata = { title: "Visão geral" };

function inicioDoMes() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1);
}

export default async function Dashboard() {
  await exigirAdmin();
  const desdeMes = inicioDoMes();
  const [[{ novos }], [{ mes, faturado }], [{ ativos }], recentes] = await Promise.all([
    db.select({ novos: count() }).from(schema.pedidos).where(eq(schema.pedidos.status, "novo")),
    db
      .select({ mes: count(), faturado: sum(schema.pedidos.total) })
      .from(schema.pedidos)
      .where(and(gte(schema.pedidos.criadoEm, desdeMes), ne(schema.pedidos.status, "cancelado"))),
    db.select({ ativos: count() }).from(schema.produtos).where(eq(schema.produtos.ativo, true)),
    db.select().from(schema.pedidos).orderBy(desc(schema.pedidos.criadoEm)).limit(8),
  ]);

  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Olá! 🌹</h1>
          <p>Resumo da loja e últimos pedidos que chegaram pelo site.</p>
        </div>
        <Link href="/admin/produtos/novo" className="btn btn-primary btn-sm">
          <Plus /> Novo produto
        </Link>
      </div>
      <div className="stats">
        <div className="stat">
          <span>Pedidos novos</span>
          <strong>{novos}</strong>
        </div>
        <div className="stat">
          <span>Pedidos no mês</span>
          <strong>{mes}</strong>
        </div>
        <div className="stat">
          <span>Em produtos no mês</span>
          <strong>{brl(Number(faturado ?? 0))}</strong>
        </div>
        <div className="stat">
          <span>Produtos no site</span>
          <strong>{ativos}</strong>
        </div>
      </div>
      <div className="adm-topo" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, color: "var(--forest)" }}>Últimos pedidos</h2>
        <Link href="/admin/pedidos" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 600, color: "var(--wood)" }}>
          Ver todos <ArrowRight size={16} />
        </Link>
      </div>
      <TabelaPedidos pedidos={recentes} />
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>
        Os valores somam só os produtos de pedidos registrados no site (sem entrega e sem cancelados). O pagamento é combinado pelo WhatsApp.
      </p>
    </>
  );
}
