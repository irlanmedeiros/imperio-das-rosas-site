"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { pagarPedido } from "@/app/(site)/checkout/actions";

/** Abre a página de pagamento do Asaas (gera um link novo se o anterior venceu). */
export function PagarAgora({ codigo, rotulo, secundario = false }: { codigo: string; rotulo: string; secundario?: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);

  return (
    <div>
      <button
        type="button"
        className={secundario ? "btn btn-outline" : "btn btn-primary"}
        style={secundario ? undefined : { minHeight: 56, padding: "0 34px", fontSize: 14 }}
        disabled={pendente || indo}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await pagarPedido(codigo);
            if (r.ok) {
              setIndo(true);
              window.location.href = r.url;
            } else setErro(r.erro);
          })
        }
      >
        {pendente || indo ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : <CreditCard />} {rotulo}
      </button>
      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 12 }}>
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * Enquanto o pagamento não é confirmado, recarrega os dados da página de tempos em tempos (o Asaas avisa o site
 * pelo webhook, normalmente em segundos) e quando o cliente volta para a aba.
 */
export function AguardarPagamento({ ativo, intervalo = 4000, limite = 180_000 }: { ativo: boolean; intervalo?: number; limite?: number }) {
  const router = useRouter();
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", atualizar);
    let t: ReturnType<typeof setInterval> | undefined;
    if (ativo) {
      const inicio = Date.now();
      t = setInterval(() => {
        if (Date.now() - inicio > limite) clearInterval(t);
        else atualizar();
      }, intervalo);
    }
    return () => {
      document.removeEventListener("visibilitychange", atualizar);
      clearInterval(t);
    };
  }, [ativo, intervalo, limite, router]);
  return null;
}
