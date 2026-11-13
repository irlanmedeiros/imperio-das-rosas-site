import { describe, expect, it } from "vitest";
import { arvoreCategorias, opcoesCategoria, rotuloCategoria } from "@/lib/categorias";

const cats = [
  { id: 1, nome: "Buquês", slug: "buques", ordem: 0, paiId: null },
  { id: 2, nome: "Box", slug: "box", ordem: 1, paiId: null },
  { id: 3, nome: "Girassol", slug: "girassol", ordem: 1, paiId: 1 },
  { id: 4, nome: "Rosas", slug: "rosas", ordem: 0, paiId: 1 },
  { id: 5, nome: "Lírio", slug: "lirio", ordem: 2, paiId: 1 },
  { id: 6, nome: "Box rosas", slug: "box-rosas", ordem: 0, paiId: 2 },
];

describe("arvoreCategorias", () => {
  it("agrupa as subcategorias dentro da principal, cada grupo na ordem", () => {
    const a = arvoreCategorias(cats);
    expect(a.map((c) => c.nome)).toEqual(["Buquês", "Box"]);
    expect(a[0].filhas.map((c) => c.nome)).toEqual(["Rosas", "Girassol", "Lírio"]);
    expect(a[1].filhas.map((c) => c.nome)).toEqual(["Box rosas"]);
  });

  it("subcategoria órfã ou de terceiro nível vira principal (nenhum produto some)", () => {
    const a = arvoreCategorias([
      { id: 1, nome: "A", slug: "a", ordem: 0, paiId: null },
      { id: 2, nome: "Órfã", slug: "orfa", ordem: 1, paiId: 99 },
      { id: 3, nome: "Filha", slug: "filha", ordem: 0, paiId: 1 },
      { id: 4, nome: "Neta", slug: "neta", ordem: 2, paiId: 3 },
    ]);
    expect(a.map((c) => c.nome)).toEqual(["A", "Órfã", "Neta"]);
    expect(a[0].filhas.map((c) => c.nome)).toEqual(["Filha"]);
  });
});

describe("opcoesCategoria / rotuloCategoria", () => {
  it("lista principal seguida das subcategorias, com o caminho no nome", () => {
    expect(opcoesCategoria(cats).map((o) => o.rotulo)).toEqual(["Buquês", "Buquês › Rosas", "Buquês › Girassol", "Buquês › Lírio", "Box", "Box › Box rosas"]);
    expect(rotuloCategoria(cats, 3)).toBe("Buquês › Girassol");
    expect(rotuloCategoria(cats, 2)).toBe("Box");
    expect(rotuloCategoria(cats, null)).toBeNull();
  });
});
