"use client";

import { useState, useTransition } from "react";

import { restablecerPassword } from "@/lib/actions/equipo";
import { generarPasswordTemporal } from "@/lib/password-temporal";
import { Field } from "@/components/shared/form";
import { Credenciales, PasswordTemporalInput } from "@/components/equipo/credenciales";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Persona = { id: string; nombre: string };

export function RestablecerPasswordDialog({ persona, onClose }: { persona: Persona | null; onClose: () => void }) {
  return (
    <Dialog open={persona !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {persona && <RestablecerForm persona={persona} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RestablecerForm({ persona, onClose }: { persona: Persona; onClose: () => void }) {
  const [password, setPassword] = useState(generarPasswordTemporal);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await restablecerPassword(persona.id, password);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setHecho({ email: result.email, password: result.password });
    });
  }

  if (hecho) {
    return (
      <div className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>Contraseña restablecida</DialogTitle>
          <DialogDescription>{persona.nombre} tendrá que cambiarla la próxima vez que entre.</DialogDescription>
        </DialogHeader>
        <Credenciales email={hecho.email} password={hecho.password} />
        <DialogFooter>
          <Button onClick={onClose}>Hecho</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Restablecer la contraseña de {persona.nombre}</DialogTitle>
        <DialogDescription>
          Su contraseña actual dejará de valer. Entrará con esta temporal y tendrá que elegir una propia.
        </DialogDescription>
      </DialogHeader>
      <Field label="Contraseña temporal" htmlFor="r-password" hint="Sugerida; puedes cambiarla." error={error ?? undefined}>
        <PasswordTemporalInput id="r-password" value={password} onChange={setPassword} invalid={!!error} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Restablecer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
