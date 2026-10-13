import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
});

export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  /** Preço em centavos */
  preco: integer("preco").notNull(),
  /** Preço "de" (riscado) em centavos, para promoções */
  precoDe: integer("preco_de"),
  categoriaId: integer("categoria_id").references(() => categorias.id, { onDelete: "set null" }),
  foto: text("foto"),
  ativo: boolean("ativo").notNull().default(true),
  destaque: boolean("destaque").notNull().default(false),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("produtos_ativo_ordem_idx").on(t.ativo, t.ordem)]);

export type ItemPedido = { produtoId: number; nome: string; preco: number; qtd: number; foto?: string | null };

import type { StatusPedido } from "@/lib/status";
export { STATUS_PEDIDO, type StatusPedido } from "@/lib/status";

export const pedidos = pgTable("pedidos", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  status: text("status").$type<StatusPedido>().notNull().default("novo"),
  clienteNome: text("cliente_nome").notNull(),
  clienteTelefone: text("cliente_telefone").notNull(),
  tipoEntrega: text("tipo_entrega").$type<"entrega" | "retirada">().notNull(),
  endereco: text("endereco"),
  bairro: text("bairro"),
  dataEntrega: text("data_entrega"),
  periodo: text("periodo"),
  destinatario: text("destinatario"),
  mensagemCartao: text("mensagem_cartao"),
  observacoes: text("observacoes"),
  itens: jsonb("itens").$type<ItemPedido[]>().notNull(),
  total: integer("total").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("pedidos_status_idx").on(t.status), index("pedidos_criado_em_idx").on(t.criadoEm)]);

/** Configurações e conteúdo editável, guardados como JSON por chave ("loja", "conteudo"). */
export const configuracoes = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: jsonb("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Categoria = typeof categorias.$inferSelect;
export type Produto = typeof produtos.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
