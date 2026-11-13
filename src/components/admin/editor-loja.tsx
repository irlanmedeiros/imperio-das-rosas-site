"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { salvarLoja } from "@/app/admin/actions";
import type { Loja } from "@/lib/config-types";
import { lerTaxas, taxasEmTexto } from "@/lib/entrega";
import { brl, centavosParaInput, parsePreco, soDigitos } from "@/lib/format";
import { linkWhatsApp } from "@/lib/whatsapp";

export function EditorLoja({ inicial, asaasConfigurado }: { inicial: Loja; asaasConfigurado: boolean }) {
  const [l, setL] = useState(inicial);
  const [minimo, setMinimo] = useState(centavosParaInput(inicial.pedidoMinimoCentavos || null));
  const [textoTaxas, setTextoTaxas] = useState(taxasEmTexto(inicial.taxasEntrega));
  const [outros, setOutros] = useState(inicial.taxaOutrosBairros == null ? "" : centavosParaInput(inicial.taxaOutrosBairros));
  const lidas = lerTaxas(textoTaxas);
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
      if (lidas.erros.length) {
        setMsg({ ok: false, texto: `Não entendi a taxa destas linhas: ${lidas.erros.slice(0, 3).join(" | ")}` });
        return;
      }
      const r = await salvarLoja({
        ...l,
        whatsapp: soDigitos(l.whatsapp),
        pedidoMinimoCentavos: parsePreco(minimo) ?? 0,
        taxasEntrega: lidas.taxas,
        taxaOutrosBairros: outros.trim() === "" ? null : (parsePreco(outros) ?? null),
      });
      if (r.ok) setTextoTaxas(taxasEmTexto(lidas.taxas));
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
      <div className="cartao">
        <h2>Pagamento no site e taxas de entrega</h2>
        <label className="opcao-check">
          <input type="checkbox" checked={l.pagamentoNoSite} onChange={(e) => setL({ ...l, pagamentoNoSite: e.target.checked })} />
          <span>
            <strong>Cobrar no site antes de enviar ao WhatsApp</strong>
            <small>
              No checkout, o cliente paga por Pix ou cartão (Asaas) e só depois envia o pedido pronto, já pago, no WhatsApp.
              {!asaasConfigurado && " ⚠️ Falta configurar a chave do Asaas no servidor: enquanto isso, os pedidos seguem direto para o WhatsApp."}
            </small>
          </span>
        </label>
        <div className="form-grade" style={{ marginTop: 16 }}>
          <label className="field inteiro">
            <span>Taxa de entrega por bairro (um por linha: bairro e valor)</span>
            <textarea
              className="input"
              value={textoTaxas}
              onChange={(e) => setTextoTaxas(e.target.value)}
              placeholder={"Manaíra - 10,00\nTambaú - 10,00\nBessa - 12,00\nMangabeira - 15,00"}
              style={{ minHeight: 160, fontFamily: "inherit" }}
              spellCheck={false}
            />
            <small>
              {lidas.taxas.length > 0
                ? `${lidas.taxas.length} bairros. O cliente escolhe o bairro numa lista e já vê a taxa e o total.`
                : "Sem a lista, o cliente digita o bairro e a taxa é combinada no WhatsApp (sem pagamento no site para entrega)."}
              {lidas.erros.length > 0 && <span className="erro"> Linhas sem valor: {lidas.erros.slice(0, 3).join(" | ")}</span>}
            </small>
          </label>
          <label className="field">
            <span>Taxa para outros bairros (R$)</span>
            <input className="input" inputMode="decimal" value={outros} onChange={(e) => setOutros(e.target.value)} placeholder="Vazio = combinar no WhatsApp" />
            <small>
              {outros.trim() === ""
                ? "Bairro fora da lista: o pedido vai para o WhatsApp para combinar a entrega."
                : `Bairro fora da lista paga ${brl(parsePreco(outros) ?? 0)} de entrega.`}{" "}
              Retirada na loja não tem taxa.
            </small>
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
