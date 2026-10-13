export function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "R$ 1.234,56" | "1234,56" | "1234.56" → centavos */
export function parsePreco(v: string): number | null {
  const limpo = v.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function centavosParaInput(c: number | null | undefined) {
  return c == null ? "" : (c / 100).toFixed(2).replace(".", ",");
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normaliza texto para busca sem acento/caixa */
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

export function formatarTelefone(s: string) {
  const d = soDigitos(s).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
}

export function dataBR(iso: string | null | undefined) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}
