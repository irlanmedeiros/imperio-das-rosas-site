import type { Pedido } from "@/db/schema";
import { brl, dataBR } from "./format";

export function linkWhatsApp(numero: string, mensagem?: string) {
  const base = `https://wa.me/${numero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

type PedidoMsg = Pick<
  Pedido,
  | "codigo" | "clienteNome" | "clienteTelefone" | "tipoEntrega" | "endereco" | "bairro"
  | "dataEntrega" | "periodo" | "destinatario" | "mensagemCartao" | "observacoes" | "itens" | "total"
>;

/** Mensagem do pedido que o cliente envia para a loja. */
export function mensagemPedido(p: PedidoMsg) {
  const linhas = [
    `🌹 *Novo pedido ${p.codigo}* — Império das Rosas`,
    "",
    ...p.itens.map((i) => `• ${i.qtd}x ${i.nome} — ${brl(i.preco * i.qtd)}`),
    "",
    `*Total dos produtos:* ${brl(p.total)}`,
    p.tipoEntrega === "entrega" ? "_Taxa de entrega a confirmar_" : "",
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
