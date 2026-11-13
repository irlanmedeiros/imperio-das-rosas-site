/** "pagamento" = pedido feito no site esperando o cliente pagar no Asaas (vira "confirmado" quando o pagamento cai). */
export const STATUS_PEDIDO = ["pagamento", "novo", "confirmado", "preparo", "saiu", "entregue", "cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  pagamento: "Aguardando pagamento",
  novo: "Novo",
  confirmado: "Confirmado",
  preparo: "Em preparo",
  saiu: "Saiu p/ entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Pedidos que a loja ainda precisa atender (contador do menu e da visão geral). */
export const STATUS_A_ATENDER: StatusPedido[] = ["novo", "confirmado"];
