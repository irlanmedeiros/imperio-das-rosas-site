import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirDono } from "@/lib/auth";
import { GerenciarUsuarios } from "@/components/admin/gerenciar-usuarios";

export const metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const eu = await exigirDono();
  const usuarios = await db
    .select({ id: schema.usuarios.id, nome: schema.usuarios.nome, email: schema.usuarios.email, papel: schema.usuarios.papel, criadoEm: schema.usuarios.criadoEm })
    .from(schema.usuarios)
    .orderBy(asc(schema.usuarios.nome));
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Usuários</h1>
          <p>Quem pode entrar no painel. A equipe vê tudo, menos esta aba; o dono também gerencia os usuários.</p>
        </div>
      </div>
      <GerenciarUsuarios
        eu={eu.email}
        principal={process.env.ADMIN_EMAIL ?? ""}
        usuarios={usuarios.map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() }))}
      />
    </>
  );
}
