"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { generarPasswordTemporal } from "@/lib/password-temporal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Temporary password input with the suggested value, editable and regenerable. */
export function PasswordTemporalInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
        aria-invalid={invalid}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Sugerir otra contraseña"
        onClick={() => onChange(generarPasswordTemporal())}
      >
        <RefreshCw />
      </Button>
    </div>
  );
}

/**
 * Shown once after creating an account or resetting a password: the director
 * hands these over; the password is not stored anywhere readable.
 */
export function Credenciales({ email, password }: { email: string; password: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const texto = `Acceso al CRM: ${window.location.origin}/login\nEmail: ${email}\nContraseña temporal: ${password}\nAl entrar te pedirá elegir una contraseña propia.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3 rounded-xl bg-surface/70 p-4 ring-1 ring-foreground/6">
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Email</dt>
          <dd className="text-sm break-all">{email}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="eyebrow">Contraseña temporal</dt>
          <dd className="font-mono text-base tracking-wide select-all">{password}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Pásale estos datos por un canal privado. Es la única vez que se muestra la contraseña; al entrar tendrá
        que cambiarla por una propia.
      </p>
      <Button type="button" variant="outline" onClick={copiar} className="self-start">
        {copiado ? <Check /> : <Copy />}
        {copiado ? "Copiado" : "Copiar datos de acceso"}
      </Button>
    </div>
  );
}
