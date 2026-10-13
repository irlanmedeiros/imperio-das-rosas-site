import { EditorLoja } from "@/components/admin/editor-loja";
import type { Loja } from "@/lib/config-types";
import { lerConfig } from "@/lib/data";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const loja = await lerConfig<Loja>("loja");
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Configurações da loja</h1>
          <p>Contato, horário e informações de entrega usados em todo o site.</p>
        </div>
      </div>
      <EditorLoja inicial={loja} />
    </>
  );
}
