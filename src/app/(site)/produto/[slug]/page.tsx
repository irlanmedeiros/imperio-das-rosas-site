import { Clock, Gift, PenLine, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flor } from "@/components/icones";
import { Revelar } from "@/components/revelar";
import { Carrossel } from "@/components/site/carrossel";
import { AcoesProduto } from "@/components/site/acoes-produto";
import { Preco } from "@/components/site/produto-card";
import { getCatalogo, getLoja, getProduto } from "@/lib/data";
import { brl } from "@/lib/format";

export const revalidate = 86400;

export async function generateStaticParams() {
  if (!process.env.DATABASE_URL) return []; // build sem banco: as páginas são geradas no primeiro acesso
  const { produtos } = await getCatalogo();
  return produtos.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getProduto((await params).slug);
  if (!r) return {};
  const { produto: p } = r;
  return {
    title: p.nome,
    description: p.descricao ?? `${p.nome} por ${brl(p.preco)}. Entrega no mesmo dia em João Pessoa.`,
    openGraph: { images: p.foto ? [{ url: p.foto }] : undefined },
  };
}

export default async function ProdutoPage({ params }: Props) {
  const [r, loja] = await Promise.all([getProduto((await params).slug), getLoja()]);
  if (!r) notFound();
  const { produto: p, relacionados, categoria } = r;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nome,
    image: p.foto ?? undefined,
    offers: { "@type": "Offer", priceCurrency: "BRL", price: (p.preco / 100).toFixed(2), availability: "https://schema.org/InStock" },
  };

  return (
    <>
      <section className="secao" style={{ paddingTop: 32 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="container">
          <nav className="migalhas" aria-label="Você está em">
            <Link href="/">Início</Link>/<Link href="/catalogo">Catálogo</Link>
            {categoria && (
              <>
                /<Link href={`/catalogo?categoria=${categoria.slug}`}>{categoria.nome}</Link>
              </>
            )}
          </nav>
          <div className="pdp">
            <Revelar className="pdp-foto">
              {p.foto ? (
                <Image src={p.foto} alt={p.nome} fill preload fetchPriority="high" sizes="(max-width: 900px) 100vw, 50vw" />
              ) : (
                <Flor style={{ position: "absolute", inset: 0, margin: "auto", width: 90, color: "var(--sage)" }} />
              )}
            </Revelar>
            <Revelar atraso={0.1}>
              {categoria && <span className="pdp-categoria">{categoria.nome}</span>}
              <h1>{p.nome}</h1>
              <div className="pdp-preco">
                <Preco p={p} />
              </div>
              {p.descricao && <p className="pdp-desc">{p.descricao}</p>}
              <AcoesProduto p={p} whatsapp={loja.whatsapp} />
              <ul className="pdp-lista">
                <li>
                  <Truck /> <span>{loja.avisoTopo}. {loja.infoEntrega}</span>
                </li>
                <li>
                  <PenLine /> <span>Cartão com a sua mensagem, escrito à mão, sem custo.</span>
                </li>
                <li>
                  <Gift /> <span>Complete com chocolates, pelúcias ou vinho no carrinho.</span>
                </li>
                <li>
                  <Clock /> <span>{loja.horario}.</span>
                </li>
              </ul>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
                As flores podem variar levemente conforme a estação, sempre mantendo o estilo e o valor do arranjo.
              </p>
            </Revelar>
          </div>
        </div>
      </section>
      {relacionados.length > 0 && (
        <section className="secao secao-branca" style={{ paddingTop: 56 }}>
          <div className="container">
            <Carrossel titulo="Você também pode gostar" verTudo={`/catalogo?categoria=${p.categoria}`} produtos={relacionados} />
          </div>
        </section>
      )}
    </>
  );
}
