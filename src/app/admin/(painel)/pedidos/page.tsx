import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { STATUS_PEDIDO, type StatusPedido } from "@/db/schema";
import { ROTULO_STATUS, TabelaPedidos } from "@/components/admin/tabela-pedidos";

export const metadata = { title: "Pedidos" };

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filtro = STATUS_PEDIDO.includes(status as StatusPedido) ? (status as StatusPedido) : null;
  const [pedidos, contagem] = await Promise.all([
    db
      .select()
      .from(schema.pedidos)
      .where(filtro ? eq(schema.pedidos.status, filtro) : undefined)
      .orderBy(desc(schema.pedidos.criadoEm))
      .limit(200),
    db.select({ status: schema.pedidos.status, n: count() }).from(schema.pedidos).groupBy(schema.pedidos.status),
  ]);
  const n = (s: string) => contagem.find((c) => c.status === s)?.n ?? 0;
  const total = contagem.reduce((s, c) => s + c.n, 0);

  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Pedidos</h1>
          <p>Pedidos feitos pelo site. Atualize o status conforme a loja for atendendo.</p>
        </div>
      </div>
      <div className="passos-status" style={{ marginBottom: 16 }}>
        <Link href="/admin/pedidos" className={!filtro ? "atual" : undefined}>
          Todos ({total})
        </Link>
        {STATUS_PEDIDO.map((s) => (
          <Link key={s} href={`/admin/pedidos?status=${s}`} className={filtro === s ? "atual" : undefined}>
            {ROTULO_STATUS[s]} ({n(s)})
          </Link>
        ))}
      </div>
      <TabelaPedidos pedidos={pedidos} />
    </>
  );
}
