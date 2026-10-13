import { ArrowRight, Clock, Gift, Heart, MessageCircle, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Flor, InstagramIcone, WhatsAppIcone } from "@/components/icones";
import { Revelar, RevelarGrupo, RevelarItem } from "@/components/revelar";
import { Carrossel } from "@/components/site/carrossel";
import { Hero } from "@/components/site/hero";
import { FotoFlutuante, FundoParallax } from "@/components/site/parallax";
import { getCatalogo, getConteudo, getLoja } from "@/lib/data";
import { linkWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const BENEFICIOS = [
  { icone: Flor, titulo: "Flores frescas", texto: "Selecionadas todos os dias" },
  { icone: Truck, titulo: "Entrega rápida", texto: "No mesmo dia em João Pessoa" },
  { icone: Heart, titulo: "Feito à mão", texto: "Arranjos autorais com carinho" },
  { icone: Gift, titulo: "Presente completo", texto: "Cartão, chocolates e pelúcias" },
];

const FRASES = ["Flores frescas todos os dias", "Entrega no mesmo dia", "Cartão com sua mensagem", "Buquês feitos à mão", "Peça pelo WhatsApp"];

export default async function Home() {
  const [loja, conteudo, { produtos, categorias }] = await Promise.all([getLoja(), getConteudo(), getCatalogo()]);
  // 1º carrossel: destaques da primeira categoria (buquês); 2º: os demais destaques
  const principal = categorias[0]?.slug;
  const destaques = produtos.filter((p) => p.destaque && p.categoria === principal);
  const presentes = produtos.filter((p) => p.destaque && p.categoria !== principal);
  const comFoto = produtos.filter((p) => p.foto);
  const insta = comFoto.slice(-6);

  return (
    <>
      <Hero hero={conteudo.hero} whatsapp={loja.whatsapp} />

      <section className="beneficios" aria-label="Por que comprar com a gente">
        <RevelarGrupo className="container beneficios-grid">
          {BENEFICIOS.map((b) => (
            <RevelarItem key={b.titulo} className="beneficio">
              <b.icone />
              <div>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </div>
            </RevelarItem>
          ))}
        </RevelarGrupo>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-trilha">
          {[...FRASES, ...FRASES, ...FRASES, ...FRASES].map((f, i) => (
            <span key={i}>{f}</span>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <section className="secao">
        <div className="container">
          <Revelar className="secao-topo">
            <span className="ornamento">Compre por categoria</span>
            <h2 className="titulo">
              O presente certo, <em>do seu jeito</em>
            </h2>
          </Revelar>
          <RevelarGrupo className="cats-grid">
            {categorias.map((c) => (
              <RevelarItem key={c.slug}>
                <Link href={`/catalogo?categoria=${c.slug}`} className="cat-card">
                  {c.foto && <Image src={c.foto} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1080px) 33vw, 200px" />}
                  <span className="cat-card-info">
                    <strong>{c.nome}</strong>
                    <small>{c.total} opções</small>
                  </span>
                </Link>
              </RevelarItem>
            ))}
          </RevelarGrupo>
        </div>
      </section>

      {/* Destaques */}
      <section className="secao secao-branca" id="destaques">
        <div className="container">
          <Revelar className="secao-topo">
            <span className="ornamento">Destaques</span>
            <h2 className="titulo">Arranjos especiais</h2>
            <p className="subtitulo">Os mais amados para presentear com beleza e emoção.</p>
          </Revelar>
          <Revelar>
            <Carrossel titulo={categorias[0]?.nome ?? "Destaques"} verTudo={`/catalogo?categoria=${principal}`} produtos={destaques} />
          </Revelar>
          <Revelar>
            <Carrossel titulo="Combos e box para presentear" verTudo="/catalogo" produtos={presentes} sentido="direita" />
          </Revelar>
          <Revelar className="secao-acao">
            <Link href="/catalogo" className="btn btn-primary">
              Ver catálogo completo <ArrowRight />
            </Link>
          </Revelar>
        </div>
      </section>

      {/* Sobre */}
      <section className="secao sobre" id="sobre">
        <div className="container sobre-grid">
          <Revelar className="sobre-texto">
            <div className="secao-topo esquerda" style={{ marginBottom: 0 }}>
              <span className="ornamento">Sobre nós</span>
              <h2 className="titulo">
                {conteudo.sobre.titulo}
                <br />
                <em>{conteudo.sobre.tituloDestaque}</em>
              </h2>
            </div>
            <p>{conteudo.sobre.texto}</p>
            <a className="btn btn-primary" href={linkWhatsApp(loja.whatsapp, "Olá! Gostaria de saber mais sobre os arranjos 🌹")} target="_blank" rel="noopener">
              <MessageCircle /> Converse com a gente
            </a>
          </Revelar>
          <div className="sobre-visual">
            <FotoFlutuante src={conteudo.sobre.imagem} alt="Flores do Império das Rosas" className="sobre-foto" />
            <Revelar className="sobre-cartao" atraso={0.3}>
              <Flor />
              <strong>Império das Rosas</strong>
              <small>Floricultura</small>
            </Revelar>
          </div>
        </div>
      </section>

      {/* Ocasiões */}
      <section className="secao" id="ocasioes">
        <div className="container">
          <Revelar className="secao-topo">
            <span className="ornamento">Ocasiões</span>
            <h2 className="titulo">Flores para cada momento</h2>
            <p className="subtitulo">Do primeiro encontro ao grande dia, temos o arranjo perfeito.</p>
          </Revelar>
          <RevelarGrupo className="ocasioes-grid" intervalo={0.1}>
            {conteudo.ocasioes.map((o) => (
              <RevelarItem key={o.titulo}>
                <Link href={`/catalogo?q=${encodeURIComponent(o.busca)}`} className="ocasiao">
                  <Image src={o.imagem} alt="" fill sizes="(max-width: 900px) 50vw, 25vw" />
                  <div className="ocasiao-info">
                    <h3>{o.titulo}</h3>
                    <span>
                      Ver opções <ArrowRight />
                    </span>
                  </div>
                </Link>
              </RevelarItem>
            ))}
          </RevelarGrupo>
        </div>
      </section>

      {/* Banner entrega */}
      <section className="banner">
        <FundoParallax src={conteudo.banner.imagem} className="banner-bg" />
        <Revelar className="container banner-conteudo">
          <span className="ornamento">Com carinho, até você</span>
          <h2>
            {conteudo.banner.titulo}
            <br />
            <em>{conteudo.banner.tituloDestaque}</em>
          </h2>
          <p>{conteudo.banner.texto}</p>
          <a className="btn btn-light" href={linkWhatsApp(loja.whatsapp, "Olá! Quero fazer um pedido 🌹")} target="_blank" rel="noopener">
            <WhatsAppIcone /> Pedir pelo WhatsApp
          </a>
          <div className="banner-itens">
            <span>
              <Truck /> Entrega no mesmo dia
            </span>
            <span>
              <Clock /> {loja.horario}
            </span>
            <span>
              <Sparkles /> Cartão personalizado
            </span>
          </div>
        </Revelar>
        <div className="selo-girando" aria-hidden>
          <svg viewBox="0 0 128 128">
            <defs>
              <path id="circulo" d="M64 14a50 50 0 1 1 0 100 50 50 0 1 1 0-100" />
            </defs>
            <text fontSize="11" letterSpacing="3.2" fill="currentColor" fontWeight="600">
              <textPath href="#circulo">ENTREGA RÁPIDA · COM CARINHO · </textPath>
            </text>
            <Flor x={40} y={38} width={48} height={48} style={{ color: "var(--sage)" }} />
          </svg>
        </div>
      </section>

      {/* Depoimentos (só aparecem quando cadastrados no admin) */}
      {conteudo.depoimentos.length > 0 && (
        <section className="secao">
          <div className="container">
            <Revelar className="secao-topo">
              <span className="ornamento">Depoimentos</span>
              <h2 className="titulo">Quem recebeu, amou</h2>
            </Revelar>
            <RevelarGrupo className="depo-grid" intervalo={0.12}>
              {conteudo.depoimentos.map((d, i) => (
                <RevelarItem key={i} className="depo">
                  <div className="depo-aspas">“</div>
                  <p>{d.texto}</p>
                  <strong>{d.nome}</strong>
                </RevelarItem>
              ))}
            </RevelarGrupo>
          </div>
        </section>
      )}

      {/* Instagram */}
      <section className="secao secao-branca">
        <div className="container">
          <Revelar className="secao-topo">
            <span className="ornamento">@{loja.instagram}</span>
            <h2 className="titulo">Siga nosso jardim no Instagram</h2>
          </Revelar>
          <RevelarGrupo className="insta-grid" intervalo={0.06}>
            {insta.map((p) => (
              <RevelarItem key={p.id}>
                <a href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener" className="insta-item" aria-label={`${p.nome} no Instagram`}>
                  <Image src={p.foto!} alt="" fill sizes="(max-width: 900px) 33vw, 16vw" />
                </a>
              </RevelarItem>
            ))}
          </RevelarGrupo>
          <Revelar className="secao-acao">
            <a className="btn btn-outline" href={`https://instagram.com/${loja.instagram}`} target="_blank" rel="noopener">
              <InstagramIcone width={18} height={18} /> Seguir @{loja.instagram}
            </a>
          </Revelar>
        </div>
      </section>
    </>
  );
}
