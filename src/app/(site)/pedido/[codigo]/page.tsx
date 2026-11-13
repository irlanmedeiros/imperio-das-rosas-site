import { eq } from "drizzle-orm";
import { Check, CreditCard, LoaderCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { Revelar } from "@/components/revelar";
import { EnviarWhatsApp } from "@/components/site/enviar-whatsapp";
import { AguardarPagamento, PagarAgora } from "@/components/site/pagamento-pedido";
import { asaasConfigurado } from "@/lib/asaas";
import { cobrancasDoPedido } from "@/lib/cobranca";
import { getLoja } from "@/lib/data";
import { brl, dataBR } from "@/lib/format";
import { rotuloForma } from "@/lib/pagamento";
import { linkWhatsApp, mensagemPedido } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

export default async function PedidoPage({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ novo?: string; pago?: string }> }) {
  const [{ codigo }, { novo, pago: voltouDoPagamento }] = await Promise.all([params, searchParams]);
  if (!/^IR-[A-Z0-9]{6}$/.test(codigo)) notFound();
  const [[pedido], loja] = await Promise.all([db.select().from(schema.pedidos).where(eq(schema.pedidos.codigo, codigo)), getLoja()]);
  if (!pedido) notFound();

  const cobrancas = asaasConfigurado() ? await cobrancasDoPedido(pedido.id) : [];
  const paga = cobrancas.find((c) => c.status === "pago");
  // cobrança que vale para o resumo: a paga, senão a mais recente
  const cobranca = paga ?? cobrancas.find((c) => c.status === "pendente") ?? cobrancas[0];
  const aguardando = !paga && pedido.status === "pagamento";
  const confirmando = aguardando && voltouDoPagamento === "1";

  const url = linkWhatsApp(
    loja.whatsapp,
    mensagemPedido(pedido, paga && { valor: paga.valor, taxaEntrega: paga.taxaEntrega, forma: paga.forma ? rotuloForma(paga.forma) : null }),
  );
  const ajuda = linkWhatsApp(loja.whatsapp, `Olá! Preciso de ajuda com o pagamento do pedido ${pedido.codigo} 🌹`);

  return (
    <section className="secao">
      <AguardarPagamento ativo={confirmando} />
      <div className="container confirmacao">
        <Revelar>
          {aguardando ? (
            <>
              <div className="confirmacao-icone">{confirmando ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : <CreditCard />}</div>
              <span className="ornamento">{confirmando ? "Quase pronto" : "Pedido reservado"}</span>
              <h1 className="titulo">{confirmando ? "Confirmando seu pagamento…" : "Falta só o pagamento"}</h1>
              <p className="subtitulo">
                {confirmando
                  ? "Isso leva poucos segundos. Assim que o pagamento for confirmado, o pedido vai pronto para o WhatsApp da loja."
                  : pedido.tipoEntrega === "entrega"
                    ? "Pague os produtos com Pix ou cartão para confirmar o pedido. Depois, envie o pedido pronto no WhatsApp da loja e combine a entrega por lá."
                    : "Pague com Pix ou cartão para confirmar o pedido. Depois do pagamento, você envia o pedido pronto no WhatsApp da loja."}
              </p>
              <div className="codigo">{pedido.codigo}</div>
              {!confirmando && <PagarAgora codigo={pedido.codigo} rotulo={cobranca ? `Pagar ${brl(cobranca.valor)}` : "Pagar agora"} />}
              {confirmando && (
                <p className="nota" style={{ marginBottom: 24 }}>
                  Já pagou e a confirmação não chegou? <PagarAgoraLink codigo={pedido.codigo} /> ou{" "}
                  <a href={ajuda} target="_blank" rel="noopener" style={{ color: "var(--olive)", fontWeight: 600 }}>
                    fale com a loja
                  </a>
                  .
                </p>
              )}
              {!confirmando && (
                <p className="nota" style={{ marginBottom: 24 }}>
                  Precisa de ajuda?{" "}
                  <a href={ajuda} target="_blank" rel="noopener" style={{ color: "var(--olive)", fontWeight: 600 }}>
                    Fale com a loja no WhatsApp
                  </a>
                  .
                </p>
              )}
            </>
          ) : (
            <>
              <div className="confirmacao-icone">
                <Check />
              </div>
              <span className="ornamento">{paga ? "Pagamento confirmado" : "Pedido registrado"}</span>
              <h1 className="titulo">{paga ? "Pago! Agora envie no WhatsApp" : "Agora é só enviar no WhatsApp"}</h1>
              <p className="subtitulo">
                {paga
                  ? pedido.tipoEntrega === "entrega"
                    ? "Recebemos o seu pagamento. Envie a mensagem pronta para a loja e combine a taxa de entrega por lá."
                    : "Recebemos o seu pagamento. Envie a mensagem pronta para a loja já começar a preparar o seu pedido."
                  : "Seu pedido já está com a gente. Envie a mensagem pronta para a loja confirmar a entrega e o pagamento."}
              </p>
              <div className="codigo">{pedido.codigo}</div>
              {paga && (
                <p className="aviso-pago" role="status">
                  Pagamento confirmado{paga.forma ? ` (${rotuloForma(paga.forma)})` : ""}. Obrigado! 🌹
                </p>
              )}
              <EnviarWhatsApp url={url} automatico={novo === "1" || (Boolean(paga) && voltouDoPagamento === "1")} />
            </>
          )}
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
          {cobranca ? (
            <>
              <div className="linha-sub" style={{ marginTop: 14 }}>
                <span>{pedido.tipoEntrega === "entrega" ? "Entrega" : "Retirada na loja"}</span>
                <span>{cobranca.taxaEntrega ? brl(cobranca.taxaEntrega) : pedido.tipoEntrega === "entrega" ? "a combinar no WhatsApp" : "sem taxa"}</span>
              </div>
              <div className="linha-total">
                <span>{paga ? "Total pago" : "Total"}</span>
                <strong>{brl(cobranca.valor)}</strong>
              </div>
            </>
          ) : (
            <div className="linha-total" style={{ marginTop: 14 }}>
              <span>Total dos produtos</span>
              <strong>{brl(pedido.total)}</strong>
            </div>
          )}
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

/** Link discreto para tentar o pagamento de novo (abre o link que está valendo). */
function PagarAgoraLink({ codigo }: { codigo: string }) {
  return (
    <Link href={`/pedido/${codigo}`} style={{ color: "var(--olive)", fontWeight: 600 }}>
      Ver opções de pagamento
    </Link>
  );
}
