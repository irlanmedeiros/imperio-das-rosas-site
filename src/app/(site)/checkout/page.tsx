import type { Metadata } from "next";
import { FormCheckout } from "@/components/site/form-checkout";
import { getLoja } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage() {
  const loja = await getLoja();
  return (
    <section className="secao" style={{ paddingTop: 44 }}>
      <div className="container">
        <div className="secao-topo esquerda" style={{ marginBottom: 28 }}>
          <span className="ornamento">Quase lá</span>
          <h1 className="titulo">Finalizar pedido</h1>
          <p className="subtitulo">Preencha os dados e envie o pedido pronto pelo WhatsApp. A loja confirma o valor da entrega e o pagamento por lá.</p>
        </div>
        <FormCheckout infoEntrega={loja.infoEntrega} />
      </div>
    </section>
  );
}
