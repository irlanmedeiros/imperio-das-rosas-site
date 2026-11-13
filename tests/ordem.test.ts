import { describe, expect, it } from "vitest";
import { moverPara, reordenarGrupo } from "@/lib/ordem";

describe("moverPara", () => {
  it("move para cima, para baixo e para o topo", () => {
    expect(moverPara(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moverPara(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moverPara(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
  it("posição fora da lista vai para a ponta", () => {
    expect(moverPara(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
    expect(moverPara(["a", "b", "c"], 2, -5)).toEqual(["c", "a", "b"]);
  });
});

describe("reordenarGrupo", () => {
  it("reorganiza só o grupo, nas mesmas vagas; os outros produtos não se mexem", () => {
    // site: 1(buquê) 2(box) 3(buquê) 4(box) 5(buquê) → buquês reorganizados para 5, 1, 3
    expect(reordenarGrupo([1, 2, 3, 4, 5], [5, 1, 3])).toEqual([5, 2, 1, 4, 3]);
  });
  it("lista inteira (aba Todos) vira exatamente a nova ordem", () => {
    expect(reordenarGrupo([1, 2, 3], [3, 1, 2])).toEqual([3, 1, 2]);
  });
  it("ignora ids que não existem mais", () => {
    expect(reordenarGrupo([1, 2, 3], [3, 99, 1])).toEqual([3, 2, 1]);
  });
});
