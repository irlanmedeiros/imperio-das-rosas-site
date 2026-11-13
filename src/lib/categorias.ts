/** Categorias e subcategorias (dois níveis: Buquês › Rosas). Funções puras, testadas. */

export type CategoriaBase = { id: number; nome: string; slug: string; ordem: number; paiId: number | null };
export type NoCategoria<T extends CategoriaBase = CategoriaBase> = T & { filhas: T[] };

const porOrdem = (a: CategoriaBase, b: CategoriaBase) => a.ordem - b.ordem || a.id - b.id;

/**
 * Categorias principais na ordem, cada uma com as subcategorias. Subcategoria cujo pai sumiu (ou que aponta
 * para outra subcategoria) vira principal, para nenhum produto desaparecer do site.
 */
export function arvoreCategorias<T extends CategoriaBase>(cats: T[]): NoCategoria<T>[] {
  const porId = new Map(cats.map((c) => [c.id, c]));
  const ehFilha = (c: T) => c.paiId != null && c.paiId !== c.id && porId.has(c.paiId) && porId.get(c.paiId)!.paiId == null;
  const principais = cats.filter((c) => !ehFilha(c)).sort(porOrdem);
  return principais.map((p) => ({ ...p, filhas: cats.filter((c) => ehFilha(c) && c.paiId === p.id).sort(porOrdem) }));
}

/** Opções para o select de categoria do produto: "Buquês", "Buquês › Rosas"… */
export function opcoesCategoria<T extends CategoriaBase>(cats: T[]) {
  return arvoreCategorias(cats).flatMap((p) => [
    { id: p.id, rotulo: p.nome, sub: false },
    ...p.filhas.map((f) => ({ id: f.id, rotulo: `${p.nome} › ${f.nome}`, sub: true })),
  ]);
}

/** Nome completo de uma categoria ("Buquês › Rosas"), ou null. */
export function rotuloCategoria<T extends CategoriaBase>(cats: T[], id: number | null | undefined) {
  return opcoesCategoria(cats).find((o) => o.id === id)?.rotulo ?? null;
}
