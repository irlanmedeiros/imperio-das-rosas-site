/**
 * SQL idempotente das tabelas criadas depois do primeiro deploy. Usado por scripts/migrar.ts (build com
 * banco) e na hora do uso (garantirEsquema em src/db/esquema.ts), porque o build automático da Cloudflare roda sem banco.
 */
export const DDL_USUARIOS = `CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" serial PRIMARY KEY NOT NULL,
  "nome" text NOT NULL,
  "email" text NOT NULL,
  "senha_hash" text NOT NULL,
  "papel" text DEFAULT 'equipe' NOT NULL,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "usuarios_email_unique" UNIQUE("email")
)`;

export const DDL_PAGAMENTO = [
  `CREATE TABLE IF NOT EXISTS "cobrancas" (
  "id" serial PRIMARY KEY NOT NULL,
  "pedido_id" integer NOT NULL REFERENCES "pedidos"("id") ON DELETE cascade,
  "asaas_link_id" text NOT NULL,
  "url" text NOT NULL,
  "valor" integer NOT NULL,
  "taxa_entrega" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pendente' NOT NULL,
  "asaas_pagamento_id" text,
  "forma" text,
  "pago_em" timestamp with time zone,
  "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
  "atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cobrancas_asaas_link_id_unique" UNIQUE("asaas_link_id")
)`,
  `CREATE INDEX IF NOT EXISTS "cobrancas_pedido_idx" ON "cobrancas" ("pedido_id")`,
  `CREATE TABLE IF NOT EXISTS "asaas_eventos" (
  "id" text PRIMARY KEY NOT NULL,
  "evento" text NOT NULL,
  "recebido_em" timestamp with time zone DEFAULT now() NOT NULL
)`,
];

/** Subcategorias (ex.: Buquês › Rosas). Só altera a tabela se a coluna ainda não existir (sem trava à toa). */
export const DDL_CATEGORIAS = `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'categorias' AND column_name = 'pai_id') THEN
    ALTER TABLE "categorias" ADD COLUMN "pai_id" integer REFERENCES "categorias"("id") ON DELETE SET NULL;
  END IF;
END $$`;

/** Tudo o que veio depois do primeiro deploy, na ordem em que deve rodar. */
export const DDL_TUDO = [{ nome: "tabela usuarios (aba Usuários do painel)", sql: DDL_USUARIOS }, ...DDL_PAGAMENTO.map((sql, i) => ({ nome: `pagamentos Asaas (${i + 1}/${DDL_PAGAMENTO.length})`, sql })), { nome: "subcategorias (categorias.pai_id)", sql: DDL_CATEGORIAS }];
