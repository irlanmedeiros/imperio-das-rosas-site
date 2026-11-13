"use client";

import { Check, Copy, LoaderCircle, QrCode, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { gerarPix, type ResultadoPix } from "@/app/(site)/checkout/actions";
import { brl, mascaraCpf } from "@/lib/format";

type Pix = Extract<ResultadoPix, { ok: true }>["pix"];

/**
 * Pagamento por Pix sem sair do site: janela com o QR Code e o Pix copia e cola.
 * Enquanto está aberta, a página confere o pagamento a cada poucos segundos; quando o Asaas confirma
 * (webhook), a página do pedido vira "Pago!" e abre o WhatsApp.
 */
export function PagarComPix({ codigo, abrirAoCarregar, rotulo }: { codigo: string; abrirAoCarregar: boolean; rotulo: string }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aberta, setAberta] = useState(abrirAoCarregar);
  const [pix, setPix] = useState<Pix | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [precisaCpf, setPrecisaCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [carregando, iniciar] = useTransition();

  const carregar = useCallback(
    (comCpf?: string) =>
      iniciar(async () => {
        setErro(null);
        const r = await gerarPix(codigo, comCpf);
        if (r.ok) {
          setPix(r.pix);
          setPrecisaCpf(false);
        } else {
          // primeira vez sem CPF: só mostra o campo, sem mensagem de erro
          setErro(r.precisaCpf && !comCpf ? null : r.erro);
          setPrecisaCpf(Boolean(r.precisaCpf));
          if (r.pago) router.refresh();
        }
      }),
    [codigo, router],
  );

  const abrir = useCallback(() => {
    setAberta(true);
    if (!pix) carregar();
  }, [pix, carregar]);

  // vindo do checkout (?pagar=pix): a janela já nasce aberta e busca o QR Code
  useEffect(() => {
    if (abrirAoCarregar) carregar();
    // só na primeira montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);

  // com a janela aberta e o QR na tela, confere o pagamento (a página do servidor é refeita)
  useEffect(() => {
    if (!aberta || !pix) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 3000);
    const voltou = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", voltou);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", voltou);
    };
  }, [aberta, pix, router]);

  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.codigo);
    } catch {
      // navegador sem permissão: seleciona o texto para o cliente copiar
      document.getElementById("pix-codigo")?.focus();
      (document.getElementById("pix-codigo") as HTMLTextAreaElement | null)?.select();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <>
      <button type="button" className="btn btn-primary" style={{ minHeight: 56, padding: "0 34px", fontSize: 14 }} onClick={abrir}>
        <QrCode /> {rotulo}
      </button>

      <dialog
        ref={dialogo}
        className="pix-dialogo"
        aria-labelledby="pix-titulo"
        onClose={() => setAberta(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setAberta(false);
        }}
      >
        <div className="pix-caixa">
          <button type="button" className="pix-fechar" onClick={() => setAberta(false)} aria-label="Fechar">
            <X />
          </button>
          <span className="ornamento">Pagamento</span>
          <h2 id="pix-titulo">Pague com Pix</h2>

          {precisaCpf ? (
            <form
              className="pix-cpf"
              onSubmit={(e) => {
                e.preventDefault();
                carregar(cpf);
              }}
            >
              <label className="field">
                <span>CPF de quem vai pagar</span>
                <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} autoFocus />
                <small>O banco pede o CPF para gerar o Pix.</small>
              </label>
              {erro && <p className="erro">{erro}</p>}
              <button className="btn btn-primary btn-block" disabled={carregando}>
                {carregando ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Gerar Pix"}
              </button>
            </form>
          ) : !pix ? (
            <div className="pix-carregando" role="status">
              {erro ? (
                <>
                  <p className="erro">{erro}</p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => carregar()} disabled={carregando}>
                    Tentar de novo
                  </button>
                </>
              ) : (
                <>
                  <LoaderCircle style={{ animation: "girar 1s linear infinite" }} />
                  <p>Gerando o seu Pix…</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="pix-valor">
                <span>Valor</span>
                <strong>{brl(pix.valor)}</strong>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- QR Code em base64 vindo do Asaas */}
              <img className="pix-qr" src={pix.imagem} alt="QR Code do Pix" width={220} height={220} />
              <ol className="pix-passos">
                <li>Abra o app do seu banco e entre em <strong>Pix</strong>.</li>
                <li>
                  Escaneie o QR Code ou use <strong>Pix copia e cola</strong>.
                </li>
              </ol>
              <textarea id="pix-codigo" className="pix-codigo" readOnly value={pix.codigo} rows={2} aria-label="Código Pix copia e cola" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn btn-primary btn-block" onClick={copiar}>
                {copiado ? (
                  <>
                    <Check /> Código copiado!
                  </>
                ) : (
                  <>
                    <Copy /> Copiar código Pix
                  </>
                )}
              </button>
              <p className="pix-status" role="status">
                <LoaderCircle size={15} style={{ animation: "girar 1.4s linear infinite" }} /> Aguardando o pagamento. Esta tela atualiza sozinha.
              </p>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
