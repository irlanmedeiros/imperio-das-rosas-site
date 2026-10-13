import { Clock, MapPin, Phone, Truck } from "lucide-react";
import Link from "next/link";
import { InstagramIcone, WhatsAppIcone } from "@/components/icones";
import { Cabecalho, Marca } from "@/components/site/cabecalho";
import { GavetaCarrinho } from "@/components/site/gaveta-carrinho";
import { Provedores } from "@/components/site/provedores";
import { getCatalogo, getLoja } from "@/lib/data";
import { linkWhatsApp } from "@/lib/whatsapp";
import "./site.css";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [loja, { categorias }] = await Promise.all([getLoja(), getCatalogo()]);
  const insta = `https://instagram.com/${loja.instagram}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Florist",
    name: loja.nome,
    telephone: loja.telefoneExibicao,
    address: { "@type": "PostalAddress", streetAddress: loja.endereco, addressLocality: loja.cidade, addressRegion: "PB", addressCountry: "BR" },
    sameAs: [insta],
    openingHours: "Mo-Sa 08:00-18:00",
  };

  return (
    <Provedores>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="topbar">
          <div className="container">
            <span>
              <Truck /> {loja.avisoTopo}
            </span>
            <span className="horario">
              <Clock /> {loja.horario}
            </span>
            <span className="topbar-redes">
              <a href={insta} target="_blank" rel="noopener" aria-label="Instagram">
                <InstagramIcone width={15} height={15} />
              </a>
              <a href={linkWhatsApp(loja.whatsapp)} target="_blank" rel="noopener" aria-label="WhatsApp">
                <WhatsAppIcone width={15} height={15} />
              </a>
            </span>
          </div>
        </div>
        <Cabecalho whatsapp={loja.whatsapp} />
        <main>{children}</main>

        <footer className="rodape" id="contato">
          <div className="container">
            <div className="rodape-grid">
              <div>
                <Marca clara className="marca-rodape" />
                <p>Flores frescas, arranjos feitos à mão e presentes que emocionam. Entrega no mesmo dia em {loja.cidade}.</p>
              </div>
              <div>
                <h2>Catálogo</h2>
                <ul>
                  {categorias.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/catalogo?categoria=${c.slug}`}>{c.nome}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Atendimento</h2>
                <ul>
                  <li>
                    <Clock /> {loja.horario}
                  </li>
                  <li>
                    <Truck /> {loja.infoEntrega}
                  </li>
                </ul>
              </div>
              <div>
                <h2>Contato</h2>
                <ul>
                  <li>
                    <WhatsAppIcone width={16} height={16} />
                    <a href={linkWhatsApp(loja.whatsapp, "Olá! Vim pelo site 🌹")} target="_blank" rel="noopener">
                      {loja.telefoneExibicao}
                    </a>
                  </li>
                  <li>
                    <InstagramIcone width={16} height={16} />
                    <a href={insta} target="_blank" rel="noopener">
                      @{loja.instagram}
                    </a>
                  </li>
                  <li>
                    <MapPin /> {loja.endereco}
                  </li>
                  <li>
                    <Phone /> Pedidos pelo site e WhatsApp
                  </li>
                </ul>
              </div>
            </div>
            <div className="rodape-base">
              <span>© {new Date().getFullYear()} {loja.nome}. Todos os direitos reservados.</span>
              <span>Feito com carinho em {loja.cidade} · PB</span>
            </div>
          </div>
        </footer>

        <a className="whats-flutuante" href={linkWhatsApp(loja.whatsapp, "Olá! Vim pelo site 🌹")} target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
          <WhatsAppIcone />
        </a>
        <GavetaCarrinho />
    </Provedores>
  );
}
