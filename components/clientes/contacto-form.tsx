"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { crearContacto } from "@/lib/actions/contactos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ContactoForm({ clienteId }: { clienteId: string }) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const nota = String(formData.get("nota") ?? "").trim();
    if (!nota) {
      toast.error("La nota es obligatoria.");
      return;
    }

    startTransition(async () => {
      const result = await crearContacto(clienteId, { nota });
      if (!result.success) {
        toast.error("No se pudo registrar el contacto.");
        return;
      }
      toast.success("Contacto registrado.");
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        name="nota"
        placeholder="Añade una nota sobre el contacto..."
        rows={3}
        required
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando..." : "Registrar contacto"}
        </Button>
      </div>
    </form>
  );
}
