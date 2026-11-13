import type { Pedido } from "@/db/schema";
import { brl, dataBR } from "./format";

export function linkWhatsApp(numero: string, mensagem?: string) {
  if (!mensagem) return `https://wa.me/${numero}`;
  // Com texto, vai direto para api.whatsapp.com: o redirecionamento do wa.me troca emojis (🌹) por "�".
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensagem)}`;
}

type PedidoMsg = Pick<
  Pedido,
  | "codigo" | "clienteNome" | "clienteTelefone" | "tipoEntrega" | "endereco" | "bairro"
  | "dataEntrega" | "periodo" | "destinatario" | "mensagemCartao" | "observacoes" | "itens" | "total"
>;

/** Pagamento feito no site (Asaas), para a mensagem do pedido. */
export type PagamentoMsg = { valor: number; taxaEntrega: number; forma: string | null };

/** Mensagem do pedido que o cliente envia para a loja. Com `pago`, avisa que já foi pago pelo site. */
export function mensagemPedido(p: PedidoMsg, pago?: PagamentoMsg | null) {
  const entrega = p.tipoEntrega === "entrega";
  const linhas = [
    `🌹 *Novo pedido ${p.codigo}* — Império das Rosas`,
    "",
    ...p.itens.map((i) => `• ${i.qtd}x ${i.nome} — ${brl(i.preco * i.qtd)}`),
    "",
    `*Total dos produtos:* ${brl(p.total)}`,
    ...(pago
      ? [
          `✅ *Pago pelo site:* ${brl(pago.valor)}${pago.forma ? ` (${pago.forma})` : ""}`,
          // no checkout o cliente paga só os produtos; a entrega é combinada aqui na conversa
          entrega ? (pago.taxaEntrega ? `*Taxa de entrega (já paga):* ${brl(pago.taxaEntrega)}` : "_Taxa de entrega a combinar_") : "",
        ]
      : [entrega ? "_Taxa de entrega a confirmar_" : ""]),
    "",
    `*Cliente:* ${p.clienteNome} · ${p.clienteTelefone}`,
    p.tipoEntrega === "entrega"
      ? `*Entrega:* ${[p.endereco, p.bairro].filter(Boolean).join(" – ")}`
      : "*Retirada na loja*",
    p.dataEntrega ? `*Data:* ${dataBR(p.dataEntrega)}${p.periodo ? ` (${p.periodo})` : ""}` : "",
    p.destinatario ? `*Para:* ${p.destinatario}` : "",
    p.mensagemCartao ? `*Cartão:* "${p.mensagemCartao}"` : "",
    p.observacoes ? `*Obs.:* ${p.observacoes}` : "",
  ];
  return linhas.filter((l, i, arr) => l !== "" || (arr[i - 1] !== "" && i > 0)).join("\n").trim();
}
