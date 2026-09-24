"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cambiarPassword, cambiarPasswordInicial } from "@/lib/actions/cuenta";
import { PASSWORD_MINIMO } from "@/lib/validations/cuenta";
import { Field } from "@/components/shared/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Errores = Record<string, string[] | undefined>;

/**
 * `inicial`: the forced change after signing in with a temporary password
 * (redirects to the panel on success). `cambio`: from «Mi cuenta», asks for the
 * current password too.
 */
export function PasswordForm({ modo }: { modo: "inicial" | "cambio" }) {
  const [errores, setErrores] = useState<Errores>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const valor = (campo: string) => String(datos.get(campo) ?? "");

    startTransition(async () => {
      const result =
        modo === "inicial"
          ? await cambiarPasswordInicial({ password: valor("password"), confirmacion: valor("confirmacion") })
          : await cambiarPassword({
              actual: valor("actual"),
              password: valor("password"),
              confirmacion: valor("confirmacion"),
            });
      // The initial change redirects on success and never gets here.
      if (!result.success) {
        setErrores(result.error);
        return;
      }
      setErrores({});
      form.reset();
      toast.success("Contraseña cambiada.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {modo === "cambio" && (
        <Field label="Contraseña actual" htmlFor="actual" error={errores.actual?.[0]}>
          <Input
            id="actual"
            name="actual"
            type="password"
            autoComplete="current-password"
            className="h-10"
            aria-invalid={!!errores.actual}
          />
        </Field>
      )}
      <Field
        label="Nueva contraseña"
        htmlFor="password"
        hint={`Al menos ${PASSWORD_MINIMO} caracteres.`}
        error={errores.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-10"
          aria-invalid={!!errores.password}
        />
      </Field>
      <Field label="Repite la nueva contraseña" htmlFor="confirmacion" error={errores.confirmacion?.[0]}>
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          className="h-10"
          aria-invalid={!!errores.confirmacion}
        />
      </Field>

      {errores._?.[0] && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errores._[0]}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="mt-1 w-full sm:w-auto sm:self-start">
        {isPending ? "Guardando…" : modo === "inicial" ? "Guardar y entrar" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
