import { exigirAdmin } from "@/lib/auth";
import { EditorConteudo } from "@/components/admin/editor-conteudo";
import type { Conteudo } from "@/lib/config-types";
import { lerConfig } from "@/lib/data";

export const metadata = { title: "Textos e banners" };

export default async function ConteudoPage() {
  await exigirAdmin();
  const conteudo = await lerConfig<Conteudo>("conteudo");
  return (
    <>
      <div className="adm-topo">
        <div>
          <h1>Textos e banners</h1>
          <p>Edite o que aparece na página inicial. Ao salvar, o site é atualizado na hora.</p>
        </div>
      </div>
      <EditorConteudo inicial={conteudo} />
    </>
  );
}
