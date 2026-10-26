import { z } from "zod";
import type { ItemPedido } from "@/db/schema";
import { soDigitos } from "./format";

/** Dados do formulário de checkout. Preços não vêm daqui: são buscados no banco. */
export const entradaPedidoSchema = z
  .object({
    itens: z.array(z.object({ id: z.number().int().positive(), qtd: z.number().int().min(1).max(99) })).min(1, "Carrinho vazio").max(40, "Carrinho grande demais"),
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

export type EntradaPedido = z.input<typeof entradaPedidoSchema>;

/** Primeira mensagem de erro de cada campo (para mostrar embaixo do campo). */
export function errosPorCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0] ?? "geral")] ??= i.message;
  return erros;
}

/** Data de hoje em João Pessoa (AAAA-MM-DD), para não aceitar entrega no passado. */
export function hojeRecife(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(agora);
}

const CHARS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, fáceis de confundir no WhatsApp

/** Código do pedido, ex.: IR-7KQ2MD */
export function novoCodigo(bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(6))) {
  return "IR-" + Array.from(bytes, (b) => CHARS_CODIGO[b % CHARS_CODIGO.length]).join("");
}

type ProdutoPreco = { id: number; nome: string; preco: number; foto: string | null };

/** Monta os itens com o preço do banco e soma o total. Itens de produtos inexistentes/inativos são ignorados. */
export function montarItens(pedidos: { id: number; qtd: number }[], produtos: ProdutoPreco[]): { itens: ItemPedido[]; total: number } {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const itens = pedidos
    .filter((i) => porId.has(i.id))
    .map((i) => {
      const p = porId.get(i.id)!;
      return { produtoId: p.id, nome: p.nome, preco: p.preco, qtd: i.qtd, foto: p.foto };
    });
  return { itens, total: itens.reduce((s, i) => s + i.preco * i.qtd, 0) };
}
