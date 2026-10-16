import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não configurada");

// Banco local (Postgres na própria máquina) usa o driver TCP comum; o Neon só aceita o driver HTTP.
const local = ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);

// maxUses: 1 → cada conexão local serve uma consulta só; no Workers (preview da Cloudflare)
// uma conexão aberta numa requisição não pode ser reaproveitada em outra.
export const db = local
  ? (drizzlePg(new Pool({ connectionString: url, maxUses: 1 }), { schema }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>)
  : drizzleNeon(neon(url), { schema });
export { schema };
