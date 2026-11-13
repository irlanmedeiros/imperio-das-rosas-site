"use server";

import { and, asc, eq, inArray, min, ne, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { STATUS_PEDIDO, type StatusPedido } from "@/lib/status";
import { buscarUsuario, exigirAdmin, exigirDono } from "@/lib/auth";
import { conteudoSchema, lojaSchema, type Conteudo, type Loja } from "@/lib/config-types";
import { TAG_LOJA } from "@/lib/data";
import { slugify } from "@/lib/format";
import { reordenarGrupo } from "@/lib/ordem";
import { guardarFoto } from "@/lib/fotos";
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
  if (arquivo.size > 4 * 1024 * 1024) return { ok: false, erro: "Imagem muito grande (máx. 4 MB)." };
  try {
    // A foto já chega reduzida pelo navegador (upload-imagem.tsx); aqui só vai para o R2.
    const url = await guardarFoto(new Uint8Array(await arquivo.arrayBuffer()), pasta, arquivo.name.replace(/\.[^.]+$/, ""));
    return { ok: true, url };
  } catch (e) {
    console.error(e);
    return { ok: false, erro: e instanceof Error && e.message.startsWith("Use uma foto") ? e.message : "Não foi possível enviar a imagem." };
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

const listaIds = z.array(z.number().int().positive()).min(1, "Nenhum produto escolhido.").max(2000);

/**
 * Salva a ordem escolhida no painel. `ids` é o grupo reorganizado (uma categoria, ou todos) na ordem desejada;
 * os outros produtos ficam onde estão. Grava tudo numa consulta só.
 */
export async function salvarOrdemProdutos(ids: number[]): Promise<Resultado> {
  await exigirAdmin();
  const r = listaIds.safeParse(ids);
  if (!r.success || new Set(r.data).size !== r.data.length) return { ok: false, erro: "Lista de produtos inválida." };
  const atual = await db.select({ id: schema.produtos.id }).from(schema.produtos).orderBy(asc(schema.produtos.ordem), asc(schema.produtos.id));
  const nova = reordenarGrupo(
    atual.map((p) => p.id),
    r.data,
  );
  const valores = sql.join(
    nova.map((id, i) => sql`(${id}::int, ${(i + 1) * 10}::int)`),
    sql`, `,
  );
  await db.execute(sql`UPDATE produtos SET ordem = v.ordem FROM (VALUES ${valores}) AS v(id, ordem) WHERE produtos.id = v.id AND produtos.ordem IS DISTINCT FROM v.ordem`);
  atualizarSite();
  return { ok: true, mensagem: "Ordem salva." };
}

/** Muda a categoria de vários produtos de uma vez (ex.: mandar os buquês de rosas para Buquês › Rosas). */
export async function moverProdutosDeCategoria(ids: number[], categoriaId: number | null): Promise<Resultado> {
  await exigirAdmin();
  const r = listaIds.safeParse(ids);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  if (categoriaId !== null) {
    const [existe] = await db.select({ id: schema.categorias.id }).from(schema.categorias).where(eq(schema.categorias.id, categoriaId));
    if (!existe) return { ok: false, erro: "Categoria não encontrada. Recarregue a página." };
  }
  const feitos = await db
    .update(schema.produtos)
    .set({ categoriaId, atualizadoEm: new Date() })
    .where(inArray(schema.produtos.id, r.data))
    .returning({ id: schema.produtos.id });
  atualizarSite();
  return { ok: true, mensagem: `${feitos.length} ${feitos.length === 1 ? "produto movido" : "produtos movidos"}.` };
}

export async function excluirProduto(id: number): Promise<Resultado> {
  await exigirAdmin();
  await db.delete(schema.produtos).where(eq(schema.produtos.id, id));
  atualizarSite();
  return { ok: true, mensagem: "Produto excluído." };
}

/* ---------------- Categorias ---------------- */

const categoriasSchema = z
  .array(
    z.object({
      chave: z.string().min(1).max(40),
      id: z.number().int().nullable(),
      nome: z.string().trim().min(2, "Nome da categoria muito curto").max(60),
      pai: z.string().max(40).nullable(),
    }),
  )
  .max(200);
export type CategoriaParaSalvar = z.input<typeof categoriasSchema>[number];

/**
 * Salva categorias e subcategorias de uma vez: a ordem de cada grupo é a ordem da lista.
 * Só dois níveis: uma subcategoria não pode ter subcategorias.
 */
export async function salvarCategorias(lista: CategoriaParaSalvar[], removidas: number[]): Promise<Resultado> {
  await exigirAdmin();
  const r = categoriasSchema.safeParse(lista);
  if (!r.success) return { ok: false, erro: r.error.issues[0].message };
  const itens = r.data;
  const porChave = new Map(itens.map((c) => [c.chave, c]));
  for (const c of itens) {
    if (!c.pai) continue;
    const pai = porChave.get(c.pai);
    if (!pai || pai.chave === c.chave) return { ok: false, erro: `"${c.nome}": categoria principal não encontrada.` };
    if (pai.pai) return { ok: false, erro: `"${c.nome}" está dentro de "${pai.nome}", que já é uma subcategoria. Use só dois níveis.` };
  }

  for (const id of removidas) await db.delete(schema.categorias).where(eq(schema.categorias.id, id));
  // principais primeiro (as novas ganham id), depois as subcategorias, já com o id da principal
  const idPorChave = new Map<string, number>();
  const gravar = async (c: (typeof itens)[number], ordem: number, paiId: number | null) => {
    if (c.id) {
      await db.update(schema.categorias).set({ nome: c.nome, ordem, paiId }).where(eq(schema.categorias.id, c.id));
      idPorChave.set(c.chave, c.id);
      return;
    }
    let slug = slugify(c.nome) || "categoria";
    const [existe] = await db.select({ id: schema.categorias.id }).from(schema.categorias).where(eq(schema.categorias.slug, slug));
    if (existe) slug = `${slug}-${Date.now().toString(36)}`;
    const [nova] = await db.insert(schema.categorias).values({ nome: c.nome, slug, ordem, paiId }).returning({ id: schema.categorias.id });
    idPorChave.set(c.chave, nova.id);
  };
  for (const [ordem, c] of itens.filter((c) => !c.pai).entries()) await gravar(c, ordem, null);
  for (const pai of itens.filter((c) => !c.pai)) {
    for (const [ordem, c] of itens.filter((x) => x.pai === pai.chave).entries()) await gravar(c, ordem, idPorChave.get(pai.chave)!);
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
