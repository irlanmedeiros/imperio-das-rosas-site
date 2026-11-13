import "server-only";

/**
 * Integração com o Asaas. Variáveis (secrets do Worker na Cloudflare; .env.local no desenvolvimento):
 *   ASAAS_API_KEY        chave da API (produção começa com $aact_prod_, sandbox com $aact_hmlg_)
 *   ASAAS_WEBHOOK_TOKEN  token do webhook (o mesmo cadastrado no painel do Asaas, 32+ caracteres)
 *   ASAAS_AMBIENTE       "producao" (padrão) ou "sandbox"
 */
export function asaasConfigurado() {
  return Boolean(process.env.ASAAS_API_KEY);
}

function baseUrl() {
  return process.env.ASAAS_AMBIENTE === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}

export class ErroAsaas extends Error {}

async function chamar<T>(caminho: string, init: { method: "GET" | "POST" | "DELETE"; body?: unknown }): Promise<T> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new ErroAsaas("Pagamento online não configurado (falta ASAAS_API_KEY).");
  const r = await fetch(`${baseUrl()}${caminho}`, {
    method: init.method,
    headers: {
      access_token: chave,
      "Content-Type": "application/json",
      "User-Agent": "ImperioDasRosas/1.0",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15000),
  });
  const texto = await r.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    /* resposta sem JSON */
  }
  if (!r.ok) {
    const erros = (dados as { errors?: { description?: string }[] } | null)?.errors;
    const motivo = erros?.map((e) => e.description).filter(Boolean).join(" ") || `HTTP ${r.status}`;
    if (r.status === 401) throw new ErroAsaas("O Asaas recusou a chave da API (ASAAS_API_KEY inválida ou do ambiente errado).");
    throw new ErroAsaas(`O Asaas recusou o pedido: ${motivo}`);
  }
  return dados as T;
}

export type LinkPagamento = { id: string; url: string; value: number; active: boolean };

export function criarLinkPagamento(corpo: Record<string, unknown>) {
  return chamar<LinkPagamento>("/paymentLinks", { method: "POST", body: corpo });
}

export function removerLinkPagamento(id: string) {
  return chamar<{ deleted: boolean; id: string }>(`/paymentLinks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Mantido pelo nome antigo: as tabelas de pagamento fazem parte de garantirEsquema. */
export { garantirEsquema as garantirTabelasPagamento } from "@/db/esquema";
