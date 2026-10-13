import { z } from "zod";

/** Dados da loja, editáveis em Admin → Configurações. */
export const lojaSchema = z.object({
  nome: z.string().min(1),
  whatsapp: z.string().regex(/^\d{12,13}$/, "Use só números com 55 + DDD, ex.: 5583999999999"),
  telefoneExibicao: z.string(),
  instagram: z.string(),
  endereco: z.string(),
  cidade: z.string(),
  horario: z.string(),
  avisoTopo: z.string(),
  infoEntrega: z.string(),
  pedidoMinimoCentavos: z.number().int().min(0),
});
export type Loja = z.infer<typeof lojaSchema>;

const depoimentoSchema = z.object({ nome: z.string().min(1), texto: z.string().min(1) });
const ocasiaoSchema = z.object({ titulo: z.string().min(1), imagem: z.string(), busca: z.string() });

/** Textos e imagens do site, editáveis em Admin → Conteúdo. */
export const conteudoSchema = z.object({
  hero: z.object({
    titulo: z.string().min(1),
    tituloDestaque: z.string(),
    subtitulo: z.string(),
    botao: z.string().min(1),
    imagem: z.string().min(1),
  }),
  sobre: z.object({
    titulo: z.string().min(1),
    tituloDestaque: z.string(),
    texto: z.string(),
    imagem: z.string().min(1),
  }),
  banner: z.object({
    titulo: z.string().min(1),
    tituloDestaque: z.string(),
    texto: z.string(),
    imagem: z.string().min(1),
  }),
  ocasioes: z.array(ocasiaoSchema),
  depoimentos: z.array(depoimentoSchema),
});
export type Conteudo = z.infer<typeof conteudoSchema>;
export type Depoimento = z.infer<typeof depoimentoSchema>;
export type Ocasiao = z.infer<typeof ocasiaoSchema>;

export const LOJA_PADRAO: Loja = {
  nome: "Império das Rosas",
  whatsapp: "5583999999999",
  telefoneExibicao: "(83) 99999-9999",
  instagram: "imperiodasrosaspb",
  endereco: "João Pessoa – PB",
  cidade: "João Pessoa",
  horario: "Segunda a sábado, das 8h às 18h",
  avisoTopo: "Entrega no mesmo dia em João Pessoa",
  infoEntrega: "A taxa de entrega é calculada pelo bairro e confirmada no WhatsApp.",
  pedidoMinimoCentavos: 0,
};

export const CONTEUDO_PADRAO: Conteudo = {
  hero: {
    titulo: "Flores que",
    tituloDestaque: "marcam",
    subtitulo: "Arranjos exclusivos para momentos inesquecíveis e cheios de significado.",
    botao: "Ver catálogo",
    imagem: "/img/hero.jpg",
  },
  sobre: {
    titulo: "Paixão por flores,",
    tituloDestaque: "cuidado em cada detalhe.",
    texto:
      "No Império das Rosas, transformamos flores em emoções e momentos inesquecíveis. Cada arranjo é montado à mão, com flores frescas selecionadas todos os dias e o carinho de quem entende que um presente diz muito.\n\nDo buquê clássico de rosas ao box com chocolates, cuidamos de tudo para a sua surpresa chegar perfeita, com cartão personalizado e entrega no mesmo dia em João Pessoa.",
    imagem: "/img/sobre.jpg",
  },
  banner: {
    titulo: "Entregamos beleza",
    tituloDestaque: "e carinho",
    texto: "Monte seu pedido no site e finalize pelo WhatsApp. A gente cuida do resto, do cartão à entrega.",
    imagem: "/img/banner-entrega.jpg",
  },
  ocasioes: [
    { titulo: "Namorados", imagem: "/img/ocasiao-namorados.jpg", busca: "rosas" },
    { titulo: "Aniversário", imagem: "/img/ocasiao-aniversario.jpg", busca: "mix" },
    { titulo: "Casamento", imagem: "/img/ocasiao-casamento.jpg", busca: "casamento" },
    { titulo: "Agradecimento", imagem: "/img/ocasiao-agradecimento.jpg", busca: "girassóis" },
  ],
  // Só depoimentos reais (ex.: destaque de feedbacks do Instagram); a seção some enquanto estiver vazia.
  depoimentos: [],
};
