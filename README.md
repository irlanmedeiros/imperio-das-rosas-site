# Império das Rosas — site e painel

Loja da floricultura **Império das Rosas** (João Pessoa/PB): catálogo, carrinho e finalização do pedido pelo WhatsApp, mais um painel administrativo para a loja gerenciar tudo.

- Produção: https://imperio-das-rosas.vercel.app
- Painel: `/admin` (login único da loja, credenciais com o responsável pelo projeto)

## Stack

| Parte | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, Server Actions) + React 19 + TypeScript |
| Banco | **Postgres (Neon)** via **Drizzle ORM** (`src/db/schema.ts`) |
| Fotos | **Vercel Blob** (upload pelo admin, redimensionado com `sharp`) |
| Animações | **Motion** (`motion/react`) — respeita `prefers-reduced-motion` |
| Auth admin | Cookie `httpOnly` com JWT (`jose`) + senha com `bcrypt` |
| Estilo | CSS puro com variáveis (`globals.css`, `(site)/site.css`, `admin/admin.css`) |
| Hospedagem | Vercel |

> ⚠️ Next.js 16 mudou várias APIs (ex.: `middleware` → `proxy`, `params`/`searchParams` são Promises, `revalidateTag` exige perfil). Consulte `node_modules/next/dist/docs/` antes de usar uma API de memória — ver `AGENTS.md`.

## Rodando localmente

```bash
npm install
cp .env.example .env.local      # ou: vercel env pull .env.local
npm run db:push                 # cria as tabelas no banco do .env.local
npm run db:seed                 # carrega o catálogo de data/catalogo-inicial.json
npm run dev                     # http://localhost:3000
```

Use um banco de **desenvolvimento** (ex.: uma branch do Neon), não o de produção.

> No `.env.local`, os `$` do `ADMIN_PASSWORD_HASH` precisam ser escapados (`\$`), senão o Next lê o hash vazio e o login falha. Na Vercel o valor vai sem escape.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | desenvolvimento / build / servidor de produção |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run db:push` | aplica `src/db/schema.ts` no banco |
| `npm run db:studio` | interface web do banco (Drizzle Studio) |
| `npm run db:seed` | popula categorias e produtos (idempotente) |
| `npm run admin:senha -- "senha"` | gera o hash para `ADMIN_PASSWORD_HASH` |

## Estrutura

```
src/
  app/
    (site)/            páginas públicas (layout com cabeçalho, rodapé, carrinho)
      page.tsx           home
      catalogo/          catálogo com filtros e busca
      produto/[slug]/    página do produto (estática, gerada no build)
      checkout/          formulário + Server Action criarPedido (preço recalculado no servidor)
      pedido/[codigo]/   confirmação + botão que abre o WhatsApp com o pedido
    admin/
      login/             tela de login (Server Actions entrar/sair)
      (painel)/          visão geral, pedidos, produtos, categorias, conteúdo, configurações
      actions.ts         todas as mutações do admin (cada uma chama exigirAdmin)
    sitemap.ts · robots.ts · icon.png
  components/
    site/              cabeçalho, carrossel (esteira contínua), catálogo, checkout, cards…
    admin/             tabelas, formulários, upload de imagem, editores
    carrinho.tsx       store do carrinho (localStorage + useSyncExternalStore)
    revelar.tsx        animações de entrada no scroll
  db/                  schema e cliente Drizzle
  lib/
    data.ts            leituras públicas com cache (unstable_cache, tag "loja")
    config-types.ts    schema + padrões de "Configurações" e "Conteúdo" (JSON na tabela configuracoes)
    auth.ts · session.ts   sessão do admin
    whatsapp.ts        links wa.me e mensagem do pedido
  proxy.ts             barra /admin sem sessão (checagem otimista; páginas e ações revalidam)
scripts/               seed e gerador de senha
data/                  catálogo inicial exportado do banco
```

## Como os dados fluem

- **Páginas públicas são estáticas** (CDN). Os dados vêm de `src/lib/data.ts`, cacheados com a tag `loja`.
- Toda alteração no admin chama `atualizarSite()` (`src/app/admin/actions.ts`): `updateTag("loja")` + `revalidatePath("/", "layout")`. O site reflete a mudança na próxima visita.
- Mudou os **textos padrão** em `config-types.ts` ou o formato dos dados? Altere `VERSAO_CACHE` em `data.ts` — o cache da Vercel sobrevive entre deploys.
- **Pedido**: carrinho (navegador) → `criarPedido` valida com zod, busca preços no banco, grava em `pedidos` → página `/pedido/IR-XXXXXX` monta a mensagem e abre o WhatsApp da loja. Não há pagamento online; é combinado no WhatsApp.
- **Configurações e conteúdo** (WhatsApp, horário, textos, banners, ocasiões, depoimentos) ficam em `configuracoes` como JSON validado por zod, com os padrões de `config-types.ts`.

## Segurança

- `/admin` protegido em três camadas: `proxy.ts`, `exigirAdmin()` em cada página do painel e em cada Server Action.
- Preços nunca vêm do navegador; checkout tem limites de tamanho e honeypot anti-spam.
- Upload aceita só imagens, reduzidas no navegador e de novo no servidor (máx. 1600px, JPEG).
- Cabeçalhos de segurança em `next.config.ts`.

## Deploy

O projeto está ligado à Vercel (`irlanmedeiros-projects/imperio-das-rosas`). Com o repositório conectado, cada push na `main` publica em produção e cada PR gera um preview.

Manual: `vercel deploy --prod`.

Variáveis de ambiente necessárias: ver `.env.example`.

> ⚠️ **Os previews (PRs) usam o mesmo banco de produção** (a integração do Neon foi ligada a todos os ambientes). Pedidos, produtos e textos alterados num preview afetam o site real. Antes de testar mudanças de dados, crie uma *branch* no Neon e aponte o `DATABASE_URL` do ambiente Preview para ela.

## Performance (13/10/2026)

Lighthouse em produção (celular): acessibilidade, boas práticas e SEO **100** nas páginas principais; CLS **0**. Medição real com CPU 4x mais lenta e 4G: FCP ~1,1 s e LCP ~1,5 s na home. Home, produtos e checkout são servidos estáticos pela CDN (`x-vercel-cache: HIT`).
