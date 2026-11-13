import type { Metadata } from "next";
import { connection } from "next/server";
import { FormCheckout } from "@/components/site/form-checkout";
import { pagamentoNoSiteAtivo } from "@/lib/cobranca";
import { getLoja } from "@/lib/data";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage() {
  await connection(); // a chave do Asaas é lida quando o site está no ar, não no build
  const loja = await getLoja();
  const pagarNoSite = pagamentoNoSiteAtivo(loja);
  return (
    <section className="secao" style={{ paddingTop: 44 }}>
      <div className="container">
        <div className="secao-topo esquerda" style={{ marginBottom: 28 }}>
          <span className="ornamento">Quase lá</span>
          <h1 className="titulo">Finalizar pedido</h1>
          <p className="subtitulo">
            {pagarNoSite
              ? "Preencha os dados, pague com Pix ou cartão e envie o pedido pronto pelo WhatsApp."
              : "Preencha os dados e envie o pedido pronto pelo WhatsApp. A loja confirma o valor da entrega e o pagamento por lá."}
          </p>
        </div>
        <FormCheckout infoEntrega={loja.infoEntrega} pagarNoSite={pagarNoSite} taxas={loja.taxasEntrega} taxaOutros={loja.taxaOutrosBairros} />
      </div>
    </section>
  );
}
