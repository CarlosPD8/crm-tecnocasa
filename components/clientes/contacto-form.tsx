"use client";

import { useRef, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProximoContactoPicker } from "@/components/shared/proximo-contacto";
import { hoyISO } from "@/lib/filtros/tipos";

/**
 * Note composer shared by client and property histories. The caller decides
 * where the note goes via `registrar`; `children` renders extra fields
 * (e.g. «Persona contactada») above the note, so they are set before submitting.
 * The next follow-up is chosen in the same step and replaces the stored one.
 */
export function ContactoForm({
  registrar,
  proximoActual,
  children,
}: {
  registrar: (data: { nota: string; fechaProximoContacto: string }) => Promise<{ success: boolean }>;
  /** Stored follow-up (yyyy-MM-dd) or null. */
  proximoActual: string | null;
  children?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  // A follow-up that is due today or overdue is the call being logged now, so
  // it does not carry over; a future one stays unless it is changed.
  const [fechaProximo, setFechaProximo] = useState(() =>
    proximoActual && proximoActual > hoyISO() ? proximoActual : ""
  );
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const nota = String(formData.get("nota") ?? "").trim();
    if (!nota) {
      toast.error("Escribe una nota antes de registrar el contacto.");
      return;
    }

    startTransition(async () => {
      const result = await registrar({ nota, fechaProximoContacto: fechaProximo });
      if (!result.success) {
        toast.error("No se pudo registrar el contacto.");
        return;
      }
      toast.success(
        fechaProximo
          ? `Contacto registrado. Próximo: ${format(parseISO(fechaProximo), "EEEE d 'de' MMMM", { locale: es })}.`
          : "Contacto registrado."
      );
      formRef.current?.reset();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {children}
      <form
        ref={formRef}
        action={handleSubmit}
        className="overflow-hidden rounded-xl border border-input bg-card shadow-[0_1px_1px_oklch(0.35_0.03_80/0.04)] transition-[border-color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40"
      >
        <label htmlFor="nota" className="sr-only">
          Nota del contacto
        </label>
        <textarea
          id="nota"
          name="nota"
          placeholder="¿Qué se habló? Interés, objeciones, próximos pasos…"
          rows={3}
          required
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="field-sizing-content block min-h-20 w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="border-t border-border/60 px-4 py-3">
          <ProximoContactoPicker value={fechaProximo} onChange={setFechaProximo} actual={proximoActual} />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-surface/50 px-3 py-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            <kbd className="rounded border border-border bg-card px-1 font-sans text-[0.7rem]">Ctrl</kbd>{" "}
            + <kbd className="rounded border border-border bg-card px-1 font-sans text-[0.7rem]">Enter</kbd>{" "}
            para guardar
          </span>
          <Button type="submit" size="sm" disabled={isPending} className="ml-auto">
            {isPending ? "Guardando…" : "Registrar contacto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
