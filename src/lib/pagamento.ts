/** Regras de pagamento online (Asaas) sem acesso a rede ou banco — testáveis. */

export const STATUS_COBRANCA = ["pendente", "pago", "vencido", "estornado", "cancelado"] as const;
export type StatusCobranca = (typeof STATUS_COBRANCA)[number];

export const ROTULO_COBRANCA: Record<StatusCobranca, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  vencido: "Vencido",
  estornado: "Estornado",
  cancelado: "Link cancelado",
};

/**
 * Evento do webhook → novo status da cobrança. null = evento que não muda nada (visualização, criação…).
 * PAYMENT_CONFIRMED (cartão aprovado, dinheiro ainda não liberado) já conta como pago para a loja produzir;
 * PAYMENT_RECEIVED é o dinheiro disponível (Pix/boleto chegam direto nele).
 */
export function statusPorEvento(evento: string): StatusCobranca | null {
  switch (evento) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "PAYMENT_RESTORED":
      return "pago";
    case "PAYMENT_OVERDUE":
      return "vencido";
    case "PAYMENT_REFUNDED":
    case "PAYMENT_PARTIALLY_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
    case "PAYMENT_RECEIVED_IN_CASH_UNDONE":
      return "estornado";
    case "PAYMENT_DELETED":
      return "cancelado";
    default:
      return null;
  }
}

/**
 * Pode trocar do status atual para o novo? Evita que um evento atrasado (o Asaas pode reenviar ou
 * entregar fora de ordem) desfaça um pagamento: "pago" só sai para "estornado".
 */
export function podeMudarStatus(atual: StatusCobranca, novo: StatusCobranca): boolean {
  if (atual === novo) return false;
  if (atual === "pago") return novo === "estornado";
  if (atual === "estornado") return false;
  return true;
}

/** Compara o token do webhook em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres batem). */
export function tokenConfere(recebido: string | null | undefined, esperado: string | undefined): boolean {
  if (!recebido || !esperado || esperado.length < 32) return false;
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(esperado);
  let diferenca = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diferenca |= (a[i] ?? 0) ^ b[i];
  return diferenca === 0;
}

/** Forma de pagamento do Asaas → texto da loja. */
export function rotuloForma(billingType: string | null | undefined) {
  return ({ PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito", BOLETO: "Boleto" } as Record<string, string>)[billingType ?? ""] ?? billingType ?? "";
}

type PedidoParaLink = { id: number; codigo: string; clienteNome: string; total: number; itens: { qtd: number; nome: string }[] };

/** Corpo do POST /v3/paymentLinks para um pedido (valor fixo = produtos + taxa de entrega). */
export function corpoLinkPagamento(p: PedidoParaLink, taxaEntrega: number, urlSite: string) {
  const valor = p.total + taxaEntrega;
  const itens = p.itens.map((i) => `${i.qtd}x ${i.nome}`).join(", ");
  const descricao = `${itens}${taxaEntrega ? ` + entrega` : ""} — ${p.clienteNome}`.slice(0, 500);
  return {
    name: `Pedido ${p.codigo} — Império das Rosas`,
    description: descricao,
    value: Math.round(valor) / 100,
    billingType: "UNDEFINED", // o cliente escolhe Pix, cartão ou boleto na página do Asaas
    chargeType: "DETACHED",
    dueDateLimitDays: 1,
    maxInstallmentCount: 1,
    notificationEnabled: false, // a loja fala com o cliente pelo WhatsApp
    externalReference: `pedido:${p.id}`,
    callback: { successUrl: `${urlSite.replace(/\/$/, "")}/pedido/${p.codigo}?pago=1`, autoRedirect: true },
  };
}

/** "pedido:123" → 123 */
export function pedidoDaReferencia(ref: string | null | undefined): number | null {
  const m = /^pedido:(\d+)$/.exec(ref ?? "");
  return m ? Number(m[1]) : null;
}

/** Mensagem de WhatsApp com o link de pagamento para o cliente. */
export function mensagemCobranca(nomeCliente: string, codigo: string, valor: string, url: string) {
  const primeiroNome = nomeCliente.trim().split(/\s+/)[0] ?? "";
  return `Olá, ${primeiroNome}! 🌹 Aqui é do Império das Rosas.\n\nSegue o link para pagar o pedido *${codigo}* (${valor}) por Pix, cartão ou boleto:\n${url}\n\nAssim que o pagamento cair, confirmamos por aqui.`;
}
