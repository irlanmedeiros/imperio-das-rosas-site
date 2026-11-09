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
import { DDL_PAGAMENTO, DDL_USUARIOS } from "../src/db/ddl";

const PASSOS = [
  { nome: "tabela usuarios (aba Usuários do painel)", sql: DDL_USUARIOS },
  ...DDL_PAGAMENTO.map((ddl, i) => ({ nome: `pagamentos Asaas (${i + 1}/${DDL_PAGAMENTO.length})`, sql: ddl })),
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("migrar: sem DATABASE_URL, nada a fazer.");
    return;
  }
  const { db } = await import("../src/db");
  for (const p of PASSOS) {
    await db.execute(sql.raw(p.sql));
    console.log(`migrar: ok — ${p.nome}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("migrar: falhou", e);
    process.exit(1);
  });
