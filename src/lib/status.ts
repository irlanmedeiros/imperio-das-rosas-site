export const STATUS_PEDIDO = ["novo", "confirmado", "preparo", "saiu", "entregue", "cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  preparo: "Em preparo",
  saiu: "Saiu p/ entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
