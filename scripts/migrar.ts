/**
 * Ajustes de banco que acompanham o código. Roda antes de todo build (`npm run build`),
 * inclusive na Vercel/Cloudflare, com o DATABASE_URL do ambiente. Só comandos idempotentes
 * (IF NOT EXISTS): rodar de novo não muda nada.
 *
 *   npm run db:migrar
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { sql } from "drizzle-orm";

const PASSOS = [
  {
    nome: "tabela usuarios (aba Usuários do painel)",
    sql: sql`CREATE TABLE IF NOT EXISTS "usuarios" (
      "id" serial PRIMARY KEY NOT NULL,
      "nome" text NOT NULL,
      "email" text NOT NULL,
      "senha_hash" text NOT NULL,
      "papel" text DEFAULT 'equipe' NOT NULL,
      "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "usuarios_email_unique" UNIQUE("email")
    )`,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("migrar: sem DATABASE_URL, nada a fazer.");
    return;
  }
  const { db } = await import("../src/db");
  for (const p of PASSOS) {
    await db.execute(p.sql);
    console.log(`migrar: ok — ${p.nome}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("migrar: falhou", e);
    process.exit(1);
  });
