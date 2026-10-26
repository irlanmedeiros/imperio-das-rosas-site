import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

function conectar(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  // Banco local (Postgres na própria máquina) usa o driver TCP comum; o Neon só aceita o driver HTTP.
  const local = ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
  // maxUses: 1 → cada conexão local serve uma consulta só; no Workers (preview da Cloudflare)
  // uma conexão aberta numa requisição não pode ser reaproveitada em outra.
  return local
    ? (drizzlePg(new Pool({ connectionString: url, maxUses: 1 }), { schema }) as unknown as Db)
    : drizzleNeon(neon(url), { schema });
}

let instancia: Db | undefined;

/**
 * Conexão criada no primeiro uso, não ao importar o arquivo: assim o build roda sem DATABASE_URL
 * (build automático da Cloudflare) e o banco só é exigido quando o site está no ar.
 */
export const db = new Proxy({} as Db, {
  get(_, prop) {
    instancia ??= conectar();
    const valor = Reflect.get(instancia, prop, instancia);
    return typeof valor === "function" ? valor.bind(instancia) : valor;
  },
});
export { schema };
