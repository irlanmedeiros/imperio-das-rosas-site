"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, LoaderCircle, ShoppingBag, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { criarPedido, type EntradaPedido } from "@/app/(site)/checkout/actions";
import { useCarrinho, useHidratado } from "@/components/carrinho";
import { brl } from "@/lib/format";
import { LinhaItem } from "./gaveta-carrinho";

const PERIODOS = ["Manhã (8h às 12h)", "Tarde (12h às 18h)"];

function hoje() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife" }).format(new Date());
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

function clienteSalvo(): { nome?: string; telefone?: string } {
  try {
    return JSON.parse(localStorage.getItem("imperio-cliente") ?? "{}");
  } catch {
    return {};
  }
}

export function FormCheckout({ infoEntrega }: { infoEntrega: string }) {
  // o formulário depende do carrinho e do localStorage: só monta no navegador
  return useHidratado() ? <Formulario infoEntrega={infoEntrega} /> : <div style={{ minHeight: 400 }} />;
}

function Formulario({ infoEntrega }: { infoEntrega: string }) {
  const { itens, total, limpar } = useCarrinho();
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [f, setF] = useState(() => {
    const salvo = clienteSalvo();
    return {
      clienteNome: salvo.nome ?? "",
      clienteTelefone: salvo.telefone ?? "",
      tipoEntrega: "entrega" as "entrega" | "retirada",
      endereco: "",
      bairro: "",
      dataEntrega: hoje(),
      periodo: PERIODOS[0],
      destinatario: "",
      mensagemCartao: "",
      observacoes: "",
      site: "",
    };
  });
  const minData = useMemo(() => hoje(), []);

  const set = (campo: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = campo === "clienteTelefone" ? mascaraTelefone(e.target.value) : e.target.value;
    setF((x) => ({ ...x, [campo]: v }));
    if (erros[campo]) setErros((er) => ({ ...er, [campo]: "" }));
  };

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const dados: EntradaPedido = { ...f, itens: itens.map((i) => ({ id: i.id, qtd: i.qtd })) };
    iniciar(async () => {
      const r = await criarPedido(dados);
      if (r.ok) {
        try {
          localStorage.setItem("imperio-cliente", JSON.stringify({ nome: f.clienteNome, telefone: f.clienteTelefone }));
        } catch {}
        limpar();
        router.push(`/pedido/${r.codigo}?novo=1`);
      } else {
        setErros(r.erros);
        setMensagem(r.mensagem ?? "Confira os campos destacados.");
        const primeiro = Object.keys(r.erros)[0];
        if (primeiro) document.getElementById(primeiro)?.focus();
      }
    });
  }

  if (itens.length === 0) {
    return (
      <div className="gaveta-vazia">
        <ShoppingBag />
        <p>Seu carrinho está vazio.</p>
        <Link className="btn btn-primary" href="/catalogo">
          Escolher produtos
        </Link>
      </div>
    );
  }

  const campo = (id: keyof typeof f, rotulo: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, inteiro = false) => (
    <label className={`field${inteiro ? " inteiro" : ""}`}>
      <span>{rotulo}</span>
      <input id={id} className="input" value={f[id]} onChange={set(id)} aria-invalid={!!erros[id]} {...props} />
      {erros[id] && <span className="erro">{erros[id]}</span>}
    </label>
  );

  return (
    <form className="checkout" onSubmit={enviar} noValidate>
      <div>
        <motion.div className="passo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2>
            <b>1</b> Seus dados
          </h2>
          <div className="campos">
            {campo("clienteNome", "Seu nome", { autoComplete: "name", placeholder: "Nome completo" })}
            {campo("clienteTelefone", "WhatsApp", { autoComplete: "tel", inputMode: "tel", placeholder: "(83) 9 0000-0000" })}
          </div>
        </motion.div>

        <motion.div className="passo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h2>
            <b>2</b> Entrega
          </h2>
          <div className="opcoes" role="radiogroup">
            <label className="opcao">
              <input type="radio" name="tipo" checked={f.tipoEntrega === "entrega"} onChange={() => setF((x) => ({ ...x, tipoEntrega: "entrega" }))} />
              <Truck size={22} color="var(--forest)" />
              <span>
                <strong>Entregar</strong>
                <small>No endereço que você escolher</small>
              </span>
            </label>
            <label className="opcao">
              <input type="radio" name="tipo" checked={f.tipoEntrega === "retirada"} onChange={() => setF((x) => ({ ...x, tipoEntrega: "retirada" }))} />
              <Store size={22} color="var(--forest)" />
              <span>
                <strong>Retirar na loja</strong>
                <small>Sem taxa de entrega</small>
              </span>
            </label>
          </div>
          <div className="campos">
            <AnimatePresence initial={false}>
              {f.tipoEntrega === "entrega" && (
                <motion.div
                  className="inteiro campos"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  {campo("endereco", "Endereço", { autoComplete: "street-address", placeholder: "Rua, número, complemento" }, true)}
                  {campo("bairro", "Bairro", { placeholder: "Ex.: Manaíra" })}
                  {campo("destinatario", "Quem vai receber?", { placeholder: "Nome de quem recebe (opcional)" })}
                </motion.div>
              )}
            </AnimatePresence>
            {campo("dataEntrega", "Data", { type: "date", min: minData })}
            <label className="field">
              <span>Período</span>
              <select id="periodo" className="input" value={f.periodo} onChange={set("periodo")}>
                {PERIODOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="nota" style={{ margin: "14px 0 0" }}>
            {infoEntrega}
          </p>
        </motion.div>

        <motion.div className="passo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <h2>
            <b>3</b> Cartão e observações
          </h2>
          <div className="campos">
            <label className="field inteiro">
              <span>Mensagem do cartão (grátis)</span>
              <textarea id="mensagemCartao" className="input" maxLength={300} value={f.mensagemCartao} onChange={set("mensagemCartao")} placeholder="Escreva aqui o que vai no cartão. Deixe em branco se não quiser." />
              <span className="contador-cartao">{f.mensagemCartao.length}/300</span>
            </label>
            <label className="field inteiro">
              <span>Observações</span>
              <textarea id="observacoes" className="input" maxLength={400} value={f.observacoes} onChange={set("observacoes")} placeholder="Ex.: entregar surpresa, ligar antes, ponto de referência…" style={{ minHeight: 70 }} />
            </label>
            <input type="text" name="site" value={f.site} onChange={set("site")} tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden />
          </div>
        </motion.div>
      </div>

      <motion.aside className="resumo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2>Resumo</h2>
        <div>
          <AnimatePresence initial={false}>
            {itens.map((i) => (
              <LinhaItem key={i.id} item={i} />
            ))}
          </AnimatePresence>
        </div>
        <div className="linha-total" style={{ marginTop: 18 }}>
          <span>Total dos produtos</span>
          <strong>{brl(total)}</strong>
        </div>
        <p className="nota">{f.tipoEntrega === "entrega" ? "+ taxa de entrega, confirmada no WhatsApp." : "Retirada na loja, sem taxa."}</p>
        {mensagem && (
          <p className="erro" role="alert" style={{ marginBottom: 12 }}>
            {mensagem}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={pendente}>
          {pendente ? (
            <>
              <LoaderCircle className="girando" style={{ animation: "girar 1s linear infinite" }} /> Registrando…
            </>
          ) : (
            <>
              Continuar para o WhatsApp <ArrowRight />
            </>
          )}
        </button>
        <p className="nota" style={{ marginTop: 12, marginBottom: 0, textAlign: "center" }}>
          O pagamento é combinado direto com a loja pelo WhatsApp.
        </p>
      </motion.aside>
    </form>
  );
}
