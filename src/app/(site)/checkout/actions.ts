"use server";

import { inArray, and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getLoja } from "@/lib/data";
import { soDigitos } from "@/lib/format";

const entrada = z
  .object({
    itens: z.array(z.object({ id: z.number().int().positive(), qtd: z.number().int().min(1).max(99) })).min(1, "Carrinho vazio"),
    clienteNome: z.string().trim().min(2, "Informe seu nome").max(80),
    clienteTelefone: z.string().refine((v) => soDigitos(v).length >= 10, "Telefone com DDD"),
    tipoEntrega: z.enum(["entrega", "retirada"]),
    endereco: z.string().trim().max(200).optional(),
    bairro: z.string().trim().max(80).optional(),
    dataEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data"),
    periodo: z.string().max(30).optional(),
    destinatario: z.string().trim().max(80).optional(),
    mensagemCartao: z.string().trim().max(300).optional(),
    observacoes: z.string().trim().max(400).optional(),
    site: z.string().max(0).optional(), // honeypot anti-spam
  })
  .refine((d) => d.tipoEntrega === "retirada" || (d.endereco && d.endereco.length >= 5), {
    path: ["endereco"],
    message: "Informe o endereço de entrega",
  })
  .refine((d) => d.tipoEntrega === "retirada" || (d.bairro && d.bairro.length >= 2), { path: ["bairro"], message: "Informe o bairro" });

export type EntradaPedido = z.input<typeof entrada>;
export type ResultadoPedido = { ok: true; codigo: string } | { ok: false; erros: Record<string, string>; mensagem?: string };

function hojeRecife() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
}

function novoCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "IR-" + Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function criarPedido(dados: EntradaPedido): Promise<ResultadoPedido> {
  const r = entrada.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0] ?? "geral")] ??= i.message;
    return { ok: false, erros };
  }
  const d = r.data;
  if (d.dataEntrega < hojeRecife()) return { ok: false, erros: { dataEntrega: "Escolha hoje ou uma data futura" } };

  // preços sempre do banco, nunca do navegador
  const ids = [...new Set(d.itens.map((i) => i.id))];
  const produtos = await db
    .select({ id: schema.produtos.id, nome: schema.produtos.nome, preco: schema.produtos.preco, foto: schema.produtos.foto })
    .from(schema.produtos)
    .where(and(inArray(schema.produtos.id, ids), eq(schema.produtos.ativo, true)));
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const itens = d.itens
    .filter((i) => porId.has(i.id))
    .map((i) => {
      const p = porId.get(i.id)!;
      return { produtoId: p.id, nome: p.nome, preco: p.preco, qtd: i.qtd, foto: p.foto };
    });
  if (itens.length === 0) return { ok: false, erros: {}, mensagem: "Os produtos do carrinho não estão mais disponíveis." };
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);

  const loja = await getLoja();
  if (total < loja.pedidoMinimoCentavos) {
    return { ok: false, erros: {}, mensagem: "Seu pedido ainda não atingiu o valor mínimo." };
  }

  const entrega = d.tipoEntrega === "entrega";
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const codigo = novoCodigo();
    try {
      await db.insert(schema.pedidos).values({
        codigo,
        clienteNome: d.clienteNome,
        clienteTelefone: d.clienteTelefone.trim(),
        tipoEntrega: d.tipoEntrega,
        endereco: entrega ? d.endereco : null,
        bairro: entrega ? d.bairro : null,
        dataEntrega: d.dataEntrega,
        periodo: d.periodo || null,
        destinatario: d.destinatario || null,
        mensagemCartao: d.mensagemCartao || null,
        observacoes: d.observacoes || null,
        itens,
        total,
      });
      return { ok: true, codigo };
    } catch (e) {
      if (!String(e).includes("unique")) throw e;
    }
  }
  return { ok: false, erros: {}, mensagem: "Não foi possível registrar o pedido. Tente novamente." };
}
