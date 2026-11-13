import { sql } from "drizzle-orm";
import { db } from "@/db";
import { DDL_TUDO } from "@/db/ddl";

let pronto: Promise<void> | null = null;

/**
 * Garante as tabelas/colunas criadas depois do primeiro deploy (o build da Cloudflare roda sem banco, então
 * o ajuste acontece no primeiro uso). Uma consulta só quando já está tudo certo; uma vez por instância do Worker.
 */
export function garantirEsquema() {
  pronto ??= (async () => {
    const r = await db.execute(sql`SELECT
      to_regclass('usuarios') IS NOT NULL
      AND to_regclass('cobrancas') IS NOT NULL
      AND to_regclass('asaas_eventos') IS NOT NULL
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'categorias' AND column_name = 'pai_id')
      AS ok`);
    const linhas = (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as { ok: boolean }[];
    if (linhas[0]?.ok) return;
    for (const passo of DDL_TUDO) await db.execute(sql.raw(passo.sql));
  })().catch((e) => {
    pronto = null; // tenta de novo na próxima chamada
    throw e;
  });
  return pronto;
}
