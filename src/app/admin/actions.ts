"use server";

import { put } from "@vercel/blob";
import { and, eq, min, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { STATUS_PEDIDO, type StatusPedido } from "@/lib/status";
import { buscarUsuario, exigirAdmin, exigirDono } from "@/lib/auth";
import { conteudoSchema, lojaSchema, type Conteudo, type Loja } from "@/lib/config-types";
import { TAG_LOJA } from "@/lib/data";
import { slugify } from "@/lib/format";
import { gerarHash, normalizarEmail, novoUsuarioSchema, PAPEIS, podeRemover, senhaSchema, type NovoUsuario, type Papel } from "@/lib/usuarios";

export type Resultado = { ok: true; id?: number; mensagem?: string } | { ok: false; erro: string };

/** Dados em cache + HTML estático de todas as páginas públicas são refeitos na próxima visita. */
function atualizarSite() {
  updateTag(TAG_LOJA);
  revalidatePath("/", "layout");
}

/* ---------------- Imagens ---------------- */

export async function enviarImagem(form: FormData): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  await exigirAdmin();
  const arquivo = form.get("arquivo");
  const pasta = String(form.get("pasta") ?? "produtos").replace(/[^a-z]/g, "") || "produtos";
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Nenhuma imagem enviada." };
  if (!arquivo.type.startsWith("image/")) return { ok: false, erro: "O arquivo precisa ser uma imagem." };
  try {
    const entrada = Buffer.from(await arquivo.arrayBuffer());
    const saida = await sharp(entrada).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    const nome = slugify(arquivo.name.replace(/\.[^.]+$/, "")) || "foto";
    const blob = await put(`${pasta}/${nome}.jpg`, saida, { access: "public", addRandomSuffix: true, contentType: "image/jpeg" });
    return { ok: true, url: blob.url };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: "Não foi possível processar a imagem." };
  }
}

/* ---------------- Produtos ---------------- */

const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  descricao: z.string().trim().max(2000).optional().nullable(),
  preco: z.number().int().min(1, "Informe o preço"),
  precoDe: z.number().int().min(0).nullable().optional(),
  categoriaId: z.number().int().nullable(),
  foto: z.string().url().nullable().optional(),
  ativo: z.boolean(),
  destaque: z.boolean(),
});
export type DadosProduto = z.infer<typeof produtoSchema>;

async function slugUnico(nome: string, ignorarId?: number) {
  const base = slugify(nome) || "produto";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const cond = ignorarId ? and(eq(schema.produtos.slug, slug), ne(schema.produtos.id, ignorarId)) : eq(schema.produtos.slug, slug);
    const [existe] = await db.select({ id: schema.produtos.id }).from(schema.produtos).where(cond);
    if (!existe) return slug;
  }
}

export async function salvarProduto(id: number | null, dados: DadosProduto): Promise<Resultado> {
  await exigirAdmin();
  const r = produtoSchema.safeParse(dados);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  const d = r.data;
  if (d.precoDe && d.precoDe <= d.preco) d.precoDe = null; // "de" só faz sentido se for maior
  const valores = { ...d, descricao: d.descricao || null, precoDe: d.precoDe || null, foto: d.foto || null, atualizadoEm: new Date() };
  if (id) {
    await db.update(schema.produtos).set({ ...valores, slug: await slugUnico(d.nome, id) }).where(eq(schema.produtos.id, id));
  } else {
    // produto novo aparece primeiro no catálogo
    const [{ menor }] = await db.select({ menor: min(schema.produtos.ordem) }).from(schema.produtos);
    const [novo] = await db
      .insert(schema.produtos)
      .values({ ...valores, slug: await slugUnico(d.nome), ordem: (menor ?? 0) - 1 })
      .returning({ id: schema.produtos.id });
    id = novo.id;
  }
  atualizarSite();
  return { ok: true, id, mensagem: "Produto salvo." };
}

export async function alternarProduto(id: number, campo: "ativo" | "destaque", valor: boolean): Promise<Resultado> {
  await exigirAdmin();
  await db.update(schema.produtos).set({ [campo]: valor, atualizadoEm: new Date() }).where(eq(schema.produtos.id, id));
  atualizarSite();
  return { ok: true };
}

export async function excluirProduto(id: number): Promise<Resultado> {
  await exigirAdmin();
  await db.delete(schema.produtos).where(eq(schema.produtos.id, id));
  atualizarSite();
  return { ok: true, mensagem: "Produto excluído." };
}

/* ---------------- Categorias ---------------- */

const categoriasSchema = z.array(z.object({ id: z.number().int().nullable(), nome: z.string().trim().min(2, "Nome da categoria muito curto").max(60) }));

export async function salvarCategorias(lista: { id: number | null; nome: string }[], removidas: number[]): Promise<Resultado> {
  await exigirAdmin();
  const r = categoriasSchema.safeParse(lista);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  for (const id of removidas) await db.delete(schema.categorias).where(eq(schema.categorias.id, id));
  for (const [ordem, c] of r.data.entries()) {
    if (c.id) {
      await db.update(schema.categorias).set({ nome: c.nome, ordem }).where(eq(schema.categorias.id, c.id));
    } else {
      let slug = slugify(c.nome);
      const [existe] = await db.select({ id: schema.categorias.id }).from(schema.categorias).where(eq(schema.categorias.slug, slug));
      if (existe) slug = `${slug}-${Date.now().toString(36)}`;
      await db.insert(schema.categorias).values({ nome: c.nome, slug, ordem });
    }
  }
  atualizarSite();
  return { ok: true, mensagem: "Categorias salvas." };
}

/* ---------------- Configurações e conteúdo ---------------- */

async function gravarConfig(chave: "loja" | "conteudo", valor: unknown) {
  await db
    .insert(schema.configuracoes)
    .values({ chave, valor })
    .onConflictDoUpdate({ target: schema.configuracoes.chave, set: { valor, atualizadoEm: new Date() } });
}

export async function salvarLoja(dados: Loja): Promise<Resultado> {
  await exigirAdmin();
  const r = lojaSchema.safeParse(dados);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  await gravarConfig("loja", r.data);
  atualizarSite();
  return { ok: true, mensagem: "Configurações salvas." };
}

export async function salvarConteudo(dados: Conteudo): Promise<Resultado> {
  await exigirAdmin();
  const r = conteudoSchema.safeParse(dados);
  if (!r.success) return { ok: false, erro: `${r.error.issues[0].path.join(" › ")}: ${r.error.issues[0].message}` };
  await gravarConfig("conteudo", r.data);
  atualizarSite();
  return { ok: true, mensagem: "Conteúdo publicado." };
}

/* ---------------- Pedidos ---------------- */

export async function mudarStatusPedido(id: number, status: StatusPedido): Promise<Resultado> {
  await exigirAdmin();
  if (!STATUS_PEDIDO.includes(status)) return { ok: false, erro: "Status inválido" };
  await db.update(schema.pedidos).set({ status }).where(eq(schema.pedidos.id, id));
  return { ok: true };
}

/* ---------------- Usuários (só o dono) ---------------- */

export async function criarUsuario(dados: NovoUsuario): Promise<Resultado> {
  await exigirDono();
  const r = novoUsuarioSchema.safeParse(dados);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  const { nome, email, senha, papel } = r.data;
  if (process.env.ADMIN_EMAIL && email === normalizarEmail(process.env.ADMIN_EMAIL)) return { ok: false, erro: "Esse e-mail já é o da conta principal." };
  if (await buscarUsuario(email)) return { ok: false, erro: "Já existe um usuário com esse e-mail." };
  await db.insert(schema.usuarios).values({ nome, email, papel, senhaHash: await gerarHash(senha) });
  revalidatePath("/admin/usuarios");
  return { ok: true, mensagem: `${nome} já pode entrar no painel.` };
}

export async function redefinirSenhaUsuario(id: number, senha: string): Promise<Resultado> {
  await exigirDono();
  const r = senhaSchema.safeParse(senha);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  const feito = await db.update(schema.usuarios).set({ senhaHash: await gerarHash(r.data) }).where(eq(schema.usuarios.id, id)).returning({ id: schema.usuarios.id });
  if (!feito.length) return { ok: false, erro: "Usuário não encontrado." };
  return { ok: true, mensagem: "Senha alterada." };
}

export async function mudarPapelUsuario(id: number, papel: Papel): Promise<Resultado> {
  const quem = await exigirDono();
  if (!PAPEIS.includes(papel)) return { ok: false, erro: "Papel inválido" };
  const [alvo] = await db.select({ email: schema.usuarios.email }).from(schema.usuarios).where(eq(schema.usuarios.id, id));
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };
  if (alvo.email === quem.email) return { ok: false, erro: "Você não pode mudar o próprio acesso." };
  await db.update(schema.usuarios).set({ papel }).where(eq(schema.usuarios.id, id));
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function removerUsuario(id: number): Promise<Resultado> {
  const quem = await exigirDono();
  const [alvo] = await db.select({ email: schema.usuarios.email }).from(schema.usuarios).where(eq(schema.usuarios.id, id));
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };
  const pode = podeRemover(alvo.email, quem);
  if (!pode.ok) return pode;
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
  revalidatePath("/admin/usuarios");
  return { ok: true, mensagem: "Usuário removido." };
}
