import { eq } from "drizzle-orm";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { Revelar } from "@/components/revelar";
import { EnviarWhatsApp } from "@/components/site/enviar-whatsapp";
import { getLoja } from "@/lib/data";
import { brl, dataBR } from "@/lib/format";
import { linkWhatsApp, mensagemPedido } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedido registrado", robots: { index: false } };

export default async function PedidoPage({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ novo?: string }> }) {
  const [{ codigo }, { novo }] = await Promise.all([params, searchParams]);
  if (!/^IR-[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [[pedido], loja] = await Promise.all([
    db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo)),
    getLoja(),
  ]);
  if (!pedido) notFound();
  const url = linkWhatsApp(loja.whatsapp, mensagemPedido(pedido));

  return (
    <section className="secao">
      <div className="container confirmacao">
        <Revelar>
          <div className="confirmacao-icone">
            <Check />
          </div>
          <span className="ornamento">Pedido registrado</span>
          <h1 className="titulo">Agora é só enviar no WhatsApp</h1>
          <p className="subtitulo">
            Seu pedido já está com a gente. Envie a mensagem pronta para a loja confirmar a entrega e o pagamento.
          </p>
          <div className="codigo">{pedido.codigo}</div>
          <EnviarWhatsApp url={url} automatico={novo === "1"} />
        </Revelar>
        <Revelar className="passo" atraso={0.15}>
          <h2 style={{ marginBottom: 12 }}>Resumo</h2>
          {pedido.itens.map((i) => (
            <div key={i.produtoId} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span>
                {i.qtd}x {i.nome}
              </span>
              <strong>{brl(i.preco * i.qtd)}</strong>
            </div>
          ))}
          <div className="linha-total" style={{ marginTop: 14 }}>
            <span>Total dos produtos</span>
            <strong>{brl(pedido.total)}</strong>
          </div>
          <p className="nota" style={{ marginBottom: 0 }}>
            {pedido.tipoEntrega === "entrega" ? `Entrega em ${pedido.bairro} · ` : "Retirada na loja · "}
            {dataBR(pedido.dataEntrega)} {pedido.periodo && `· ${pedido.periodo}`}
          </p>
        </Revelar>
        <Link href="/catalogo" className="btn btn-outline" style={{ marginTop: 10 }}>
          Continuar comprando
        </Link>
      </div>
    </section>
  );
}
