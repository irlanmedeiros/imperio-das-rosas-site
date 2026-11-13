/** Ordem manual dos produtos. Funções puras, testadas. */

/** Move o item da posição `de` para a posição `para` (limitada ao tamanho da lista). */
export function moverPara<T>(lista: T[], de: number, para: number): T[] {
  const alvo = Math.max(0, Math.min(lista.length - 1, para));
  if (de === alvo || de < 0 || de >= lista.length) return lista;
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(alvo, 0, item);
  return nova;
}

/**
 * Nova ordem de todos os produtos quando só um grupo (ex.: uma categoria) foi reorganizado: os produtos do
 * grupo ocupam as mesmas "vagas" que já ocupavam na lista geral, na nova sequência; os demais não se mexem.
 * `atual` = ids na ordem atual do site; `grupo` = ids do grupo na ordem desejada. Devolve todos os ids na nova ordem.
 */
export function reordenarGrupo(atual: number[], grupo: number[]): number[] {
  const doGrupo = new Set(grupo);
  const fila = grupo.filter((id) => atual.includes(id));
  const resultado = atual.map((id) => (doGrupo.has(id) ? fila.shift()! : id));
  return resultado;
}
