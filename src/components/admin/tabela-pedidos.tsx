import Link from "next/link";
import type { Pedido } from "@/db/schema";
import { brl, dataBR } from "@/lib/format";
import { ROTULO_STATUS, type StatusPedido } from "@/lib/status";

export { ROTULO_STATUS };

export function SeloStatus({ status }: { status: StatusPedido }) {
  return <span className={`status status-${status}`}>{ROTULO_STATUS[status]}</span>;
}

const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="cartao" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
        Nenhum pedido ainda. Eles aparecem aqui assim que alguém finalizar pelo site.
      </div>
    );
  }
  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Entrega</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/pedidos/${p.id}`} style={{ fontWeight: 700, color: "var(--forest)" }}>
                  {p.codigo}
                </Link>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{quando.format(p.criadoEm)}</div>
              </td>
              <td>
                {p.clienteNome}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.clienteTelefone}</div>
              </td>
              <td>
                {p.tipoEntrega === "entrega" ? p.bairro : "Retirada"}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {dataBR(p.dataEntrega)} {p.periodo?.split(" ")[0]}
                </div>
              </td>
              <td>{p.itens.reduce((s, i) => s + i.qtd, 0)}</td>
              <td style={{ fontWeight: 600 }}>{brl(p.total)}</td>
              <td>
                <SeloStatus status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
