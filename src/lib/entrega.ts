/** Taxa de entrega por bairro (Admin → Configurações). Funções puras, testadas. */
import type { TaxaBairro } from "./config-types";
import { brl, normalizar, parsePreco } from "./format";

const chave = (bairro: string) => normalizar(bairro).replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Taxa do pedido em centavos. Retirada = 0. Bairro da lista = a taxa dele; outro bairro = `outros`.
 * null = taxa desconhecida (o pedido vai para o WhatsApp para combinar a entrega).
 */
export function taxaEntrega(
  tipo: "entrega" | "retirada",
  bairro: string | null | undefined,
  taxas: TaxaBairro[],
  outros: number | null,
): number | null {
  if (tipo === "retirada") return 0;
  const k = chave(bairro ?? "");
  if (!k) return null;
  const achado = taxas.find((t) => chave(t.bairro) === k);
  return achado ? achado.valor : outros;
}

/**
 * Lê a lista colada no painel, uma linha por bairro: "Manaíra 10", "Bessa - 12,50", "Centro; R$ 8,00".
 * Devolve as taxas (sem bairros repetidos; vale a última) e as linhas que não deu para entender.
 */
export function lerTaxas(texto: string): { taxas: TaxaBairro[]; erros: string[] } {
  const porChave = new Map<string, TaxaBairro>();
  const erros: string[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    const m = /^(.*?)[\s;:=\t–—-]*(?:R\$\s*)?(\d{1,4}(?:[.,]\d{1,2})?)\s*$/i.exec(linha);
    const bairro = m?.[1].replace(/[\s;:=\t–—-]+$/, "").trim() ?? "";
    const valor = m ? parsePreco(m[2]) : null;
    if (!m || bairro.length < 2 || valor == null) {
      erros.push(linha);
      continue;
    }
    porChave.set(chave(bairro), { bairro: bairro.slice(0, 80), valor });
  }
  return { taxas: [...porChave.values()], erros };
}

/** Lista de volta em texto, para editar no painel. */
export function taxasEmTexto(taxas: TaxaBairro[]) {
  return taxas.map((t) => `${t.bairro} - ${brl(t.valor).replace(/^R\$\s?/, "")}`).join("\n");
}
