"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { salvarLoja } from "@/app/admin/actions";
import type { Loja } from "@/lib/config-types";
import { centavosParaInput, parsePreco, soDigitos } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";

export function EditorLoja({ inicial }: { inicial: Loja }) {
  const [l, setL] = useState(inicial);
  const [minimo, setMinimo] = useState(centavosParaInput(inicial.pedidoMinimoCentavos || null));
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const placeholder = l.whatsapp === "5583999999999";

  const campo = (k: keyof Loja, rotulo: string, dica?: string) => (
    <label className="field">
      <span>{rotulo}</span>
      <input className="input" value={String(l[k])} onChange={(e) => setL({ ...l, [k]: e.target.value })} />
      {dica && <small>{dica}</small>}
    </label>
  );

  function salvar() {
    iniciar(async () => {
      const r = await salvarLoja({ ...l, whatsapp: soDigitos(l.whatsapp), pedidoMinimoCentavos: parsePreco(minimo) ?? 0 });
      setMsg(r.ok ? { ok: true, texto: "Salvo! O site já usa os novos dados." } : { ok: false, texto: r.erro });
    });
  }

  return (
    <>
      <div className="cartao">
        <h2>WhatsApp dos pedidos</h2>
        <p>Todos os botões do site e os pedidos finalizados vão para este número.</p>
        {placeholder && (
          <p className="erro" style={{ marginBottom: 14, fontWeight: 600 }}>
            ⚠️ Ainda é o número de exemplo. Troque pelo WhatsApp real da loja antes de divulgar o site.
          </p>
        )}
        <div className="form-grade">
          <label className="field">
            <span>Número (só dígitos, com 55 + DDD)</span>
            <input className="input" inputMode="numeric" value={l.whatsapp} onChange={(e) => setL({ ...l, whatsapp: soDigitos(e.target.value) })} placeholder="5583999999999" />
            <small>
              <a href={linkWhatsApp(soDigitos(l.whatsapp), "Teste do site 🌹")} target="_blank" rel="noopener" style={{ color: "var(--olive)", fontWeight: 600 }}>
                Testar este número →
              </a>
            </small>
          </label>
          {campo("telefoneExibicao", "Telefone exibido no site", "Ex.: (83) 99999-9999")}
        </div>
      </div>
      <div className="cartao">
        <h2>Loja</h2>
        <div className="form-grade">
          {campo("nome", "Nome da loja")}
          {campo("instagram", "Instagram (sem @)")}
          {campo("endereco", "Endereço")}
          {campo("cidade", "Cidade")}
          {campo("horario", "Horário de atendimento")}
          {campo("avisoTopo", "Aviso na barra do topo")}
        </div>
      </div>
      <div className="cartao">
        <h2>Entrega e pedidos</h2>
        <div className="form-grade">
          <label className="field inteiro">
            <span>Informação sobre entrega</span>
            <textarea className="input" value={l.infoEntrega} onChange={(e) => setL({ ...l, infoEntrega: e.target.value })} style={{ minHeight: 80 }} />
            <small>Aparece no checkout, na página de cada produto e no rodapé.</small>
          </label>
          <label className="field">
            <span>Pedido mínimo (R$)</span>
            <input className="input" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Deixe vazio para sem mínimo" />
          </label>
        </div>
      </div>
      <div className="barra-salvar">
        {msg && <span className={`msg ${msg.ok ? "msg-ok" : "erro"}`}>{msg.texto}</span>}
        <button className="btn btn-primary" onClick={salvar} disabled={pendente}>
          {pendente ? <LoaderCircle style={{ animation: "girar 1s linear infinite" }} /> : "Salvar configurações"}
        </button>
      </div>
    </>
  );
}
