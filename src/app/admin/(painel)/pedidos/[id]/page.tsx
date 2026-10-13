import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { MudarStatus } from "@/components/admin/mudar-status";
import { SeloStatus } from "@/components/admin/tabela-pedidos";
import { WhatsAppIcone } from "@/components/icones";
import { brl, dataBR, soDigitos } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";

export const metadata = { title: "Pedido" };

const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" });

export default async function PedidoAdmin({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [p] = await db.select().from(schema.pedidos).where(eq(schema.pedidos.id, id));
  if (!p) notFound();
  const fone = soDigitos(p.clienteTelefone);
  const foneWhats = fone.length <= 11 ? `55${fone}` : fone;

  return (
    <>
      <Link href="/admin/pedidos" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--muted)", marginBottom: 14 }}>
        <ArrowLeft size={16} /> Pedidos
      </Link>
      <div className="adm-topo">
        <div>
          <h1>Pedido {p.codigo}</h1>
          <p>Recebido em {quando.format(p.criadoEm)}</p>
        </div>
        <SeloStatus status={p.status} />
      </div>
      <div className="pedido-grade">
        <div>
          <div className="cartao">
            <h2>Itens</h2>
            {p.itens.map((i) => (
              <div key={i.produtoId} className="celula-produto" style={{ padding: "10px 0", borderBottom: "1px solid #f0ece0" }}>
                <div className="miniatura">{i.foto && <Image src={i.foto} alt="" fill sizes="46px" />}</div>
                <div style={{ flex: 1 }}>
                  <strong>
                    {i.qtd}x {i.nome}
                  </strong>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{brl(i.preco)} cada</div>
                </div>
                <strong>{brl(i.preco * i.qtd)}</strong>
              </div>
            ))}
            <div className="linha-total" style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 17 }}>
              <span>Total dos produtos</span>
              <strong style={{ color: "var(--forest)" }}>{brl(p.total)}</strong>
            </div>
          </div>
          <div className="cartao">
            <h2>Status</h2>
            <p>O cliente não é avisado automaticamente: use o botão do WhatsApp para falar com ele.</p>
            <MudarStatus id={p.id} atual={p.status} />
          </div>
        </div>
        <div className="cartao">
          <h2>Cliente e entrega</h2>
          <dl className="dados">
            <dt>Cliente</dt>
            <dd>{p.clienteNome}</dd>
            <dt>WhatsApp</dt>
            <dd>{p.clienteTelefone}</dd>
            <dt>{p.tipoEntrega === "entrega" ? "Entrega" : "Retirada na loja"}</dt>
            <dd>
              {p.tipoEntrega === "entrega" && (
                <>
                  {p.endereco}
                  <br />
                  {p.bairro}
                  <br />
                </>
              )}
              {dataBR(p.dataEntrega)} · {p.periodo}
            </dd>
            {p.destinatario && (
              <>
                <dt>Quem recebe</dt>
                <dd>{p.destinatario}</dd>
              </>
            )}
            {p.mensagemCartao && (
              <>
                <dt>Mensagem do cartão</dt>
                <dd style={{ whiteSpace: "pre-line", fontFamily: "var(--font-title)", fontStyle: "italic" }}>“{p.mensagemCartao}”</dd>
              </>
            )}
            {p.observacoes && (
              <>
                <dt>Observações</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{p.observacoes}</dd>
              </>
            )}
          </dl>
          <a
            className="btn btn-whats btn-block"
            style={{ marginTop: 20 }}
            href={linkWhatsApp(foneWhats, `Olá, ${p.clienteNome.split(" ")[0]}! Aqui é do Império das Rosas sobre o seu pedido ${p.codigo} 🌹`)}
            target="_blank"
            rel="noopener"
          >
            <WhatsAppIcone /> Falar com o cliente
          </a>
        </div>
      </div>
    </>
  );
}
