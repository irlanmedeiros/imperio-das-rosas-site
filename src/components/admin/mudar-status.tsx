"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { mudarStatusPedido } from "@/app/admin/actions";
import { ROTULO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/status";

export function MudarStatus({ id, atual }: { id: number; atual: StatusPedido }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [otimista, setOtimista] = useOptimistic(atual);
  return (
    <div className="passos-status">
      {STATUS_PEDIDO.map((s) => (
        <button
          key={s}
          className={otimista === s ? "atual" : undefined}
          onClick={() =>
            iniciar(async () => {
              setOtimista(s);
              await mudarStatusPedido(id, s);
              router.refresh();
            })
          }
        >
          {ROTULO_STATUS[s]}
        </button>
      ))}
    </div>
  );
}
