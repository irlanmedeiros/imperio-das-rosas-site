"use client";

import { Copy, CreditCard, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelarCobranca, gerarCobranca } from "@/app/admin/(painel)/pedidos/[id]/actions";
import { WhatsAppIcone } from "@/components/icones";
import { brl, centavosParaInput, parsePreco } from "@/lib/format";
import { mensagemCobranca, ROTULO_COBRANCA, rotuloForma, type StatusCobranca } from "@/lib/pagamento";
import { linkWhatsApp } from "@/lib/whatsapp";

type Cobranca = { id: number; url: string; valor: number; taxaEntrega: number; status: StatusCobranca; forma: string | null; pagoEm: string | null; criadoEm: string };
type Pedido = { id: number; codigo: string; clienteNome: string; total: number; tipoEntrega: "entrega" | "retirada"; status: string; foneWhats: string };

const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" });
const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", dateStyle: "short" });

export function CobrancaPedido({ pedido, cobrancas, configurado }: { pedido: Pedido; cobrancas: Cobranca[]; configurado: boolean }) {
  const router = useRouter();
  const ultimaTaxa = cobrancas[0]?.taxaEntrega;
  const [taxa, setTaxa] = useState(ultimaTaxa ? centavosParaInput(ultimaTaxa) : pedido.tipoEntrega === "retirada" ? "0,00" : "");
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [pendente, iniciar] = useTransition();

  const taxaCentavos = taxa.trim() === "" ? null : parsePreco(taxa);
  const pago = cobrancas.some((c) => c.status === "pago");
  const pendenteAtual = cobrancas.find((c) => c.status === "pendente");

  if (!configurado) {
    return (
      <div className="cartao">
        <h2>Pagamento online</h2>
        <p style={{ marginBottom: 0 }}>Desativado: falta configurar o Asaas no servidor (ASAAS_API_KEY).</p>
      </div>
    );
  }

  function gerar() {
    if (taxaCentavos == null) return setErro(pedido.tipoEntrega === "entrega" ? "Informe a taxa de entrega (0 se for grátis)." : "Taxa inválida.");
    setErro(null);
    iniciar(async () => {
      const r = await gerarCobranca(pedido.id, taxaCentavos);
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  }

  function cancelar(id: number) {
    if (!confirm("Cancelar este link? O cliente não conseguirá mais pagar por ele.")) return;
    iniciar(async () => {
      const r = await cancelarCobranca(id);
      if (!r.ok) setErro(r.erro);
      else router.refresh();
    });
  }

  async function copiar(c: Cobranca) {
    await navigator.clipboard.writeText(c.url).catch(() => {});
    setCopiado(c.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="cartao">
      <h2>
        <CreditCard size={17} style={{ verticalAlign: "-3px", marginRight: 6 }} />
        Pagamento online (Asaas)
      </h2>
      <p>O cliente paga por Pix, cartão ou boleto. Quando o pagamento cai, o pedido muda sozinho para Confirmado.</p>

      {!pago && pedido.status !== "cancelado" && (
        <div className="cobranca-gerar">
          <label className="field">
            <span>Taxa de entrega (R$)</span>
            <input className="input" inputMode="decimal" placeholder="Ex.: 15,00" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
          </label>
          <div className="cobranca-total">
            Total a cobrar
            <strong>{taxaCentavos == null ? "—" : brl(pedido.total + taxaCentavos)}</strong>
          </div>
          <button className="btn btn-primary" onClick={gerar} disabled={pendente}>
            {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : pendenteAtual ? "Gerar novo link" : "Gerar link de pagamento"}
          </button>
          {pendenteAtual && <small className="importar-dica">Gerar um novo link cancela o anterior.</small>}
        </div>
      )}
      {erro && (
        <p className="erro" role="alert" style={{ marginTop: 10 }}>
          {erro}
        </p>
      )}

      {cobrancas.length > 0 && (
        <ul className="cobrancas">
          {cobrancas.map((c) => (
            <li key={c.id} className={`cobranca cobranca-${c.status}`}>
              <div className="cobranca-topo">
                <span className={`selo-cobranca selo-${c.status}`}>{ROTULO_COBRANCA[c.status]}</span>
                <strong>{brl(c.valor)}</strong>
              </div>
              <small>
                {c.taxaEntrega ? `Produtos ${brl(c.valor - c.taxaEntrega)} + entrega ${brl(c.taxaEntrega)}` : "Sem taxa de entrega"} · gerado em {quando.format(new Date(c.criadoEm))}
                {c.status === "pago" && c.pagoEm && ` · pago em ${dia.format(new Date(c.pagoEm))}`}
                {c.forma && ` · ${rotuloForma(c.forma)}`}
              </small>
              {c.status === "pendente" && (
                <div className="cobranca-acoes">
                  <a
                    className="btn btn-whats btn-sm"
                    href={linkWhatsApp(pedido.foneWhats, mensagemCobranca(pedido.clienteNome, pedido.codigo, brl(c.valor), c.url))}
                    target="_blank"
                    rel="noopener"
                  >
                    <WhatsAppIcone /> Enviar ao cliente
                  </a>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => copiar(c)}>
                    <Copy /> {copiado === c.id ? "Copiado!" : "Copiar link"}
                  </button>
                  <a className="btn-icone" href={c.url} target="_blank" rel="noopener" aria-label="Abrir link de pagamento">
                    <ExternalLink />
                  </a>
                  <button type="button" className="btn-icone perigo" onClick={() => cancelar(c.id)} disabled={pendente} aria-label="Cancelar link">
                    <X />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
