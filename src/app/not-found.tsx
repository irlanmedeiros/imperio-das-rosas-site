import Link from "next/link";
import { Flor } from "@/components/icones";

export default function NaoEncontrado() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <Flor style={{ width: 64, height: 64, color: "var(--sage)", margin: "0 auto 18px" }} />
        <h1 className="titulo">Página não encontrada</h1>
        <p className="subtitulo" style={{ marginBottom: 26 }}>Esse endereço não existe ou o produto saiu do catálogo.</p>
        <Link href="/catalogo" className="btn btn-primary">
          Ver catálogo
        </Link>
      </div>
    </main>
  );
}
