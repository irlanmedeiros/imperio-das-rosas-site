import type { Metadata } from "next";
import { Revelar } from "@/components/revelar";
import { Catalogo } from "@/components/site/catalogo";
import { getCatalogo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Buquês, ramalhetes, box, combos, chocolates, pelúcias e vinhos. Escolha e finalize pelo WhatsApp.",
};

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<{ categoria?: string; q?: string }> }) {
  const [{ categoria, q }, { produtos, categorias }] = await Promise.all([searchParams, getCatalogo()]);
  const catInicial = categorias.some((c) => c.slug === categoria) ? categoria! : "todos";

  return (
    <section className="secao" style={{ paddingTop: 48 }}>
      <div className="container">
        <Revelar className="secao-topo">
          <span className="ornamento">Catálogo</span>
          <h1 className="titulo">Nossos produtos</h1>
          <p className="subtitulo">Escolha, adicione ao carrinho e finalize seu pedido pelo WhatsApp.</p>
        </Revelar>
        <Catalogo produtos={produtos} categorias={categorias} catInicial={catInicial} buscaInicial={q ?? ""} />
      </div>
    </section>
  );
}
