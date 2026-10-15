"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { crearUsuario, editarUsuario } from "@/lib/actions/equipo";
import { generarPasswordTemporal } from "@/lib/password-temporal";
import { ROL_DESCRIPCION, ROL_LABELS } from "@/lib/validations/usuario";
import type { RolUsuario } from "@/lib/generated/prisma/enums";
import { Field, Segmented } from "@/components/shared/form";
import { Credenciales, PasswordTemporalInput } from "@/components/equipo/credenciales";
import { SelectorMultiple } from "@/components/zonas/selector-multiple";
import type { OpcionZona } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Errores = Record<string, string[] | undefined>;

function ErrorGeneral({ errores }: { errores: Errores }) {
  if (!errores._?.[0]) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {errores._[0]}
    </p>
  );
}

function RolField({ value, onChange, error }: { value: RolUsuario; onChange: (v: RolUsuario) => void; error?: string }) {
  return (
    <Field label="Rol" error={error} hint={ROL_DESCRIPCION[value]}>
      <Segmented name="rol" aria-label="Rol" value={value} onChange={onChange} options={ROL_LABELS} />
    </Field>
  );
}

/** Only for advisors: a director sees every zone. */
function ZonasField({
  zonas,
  value,
  onChange,
  error,
}: {
  zonas: OpcionZona[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  return (
    <Field label="Zonas" error={error} hint="Solo verá los pisos y bloques de estas zonas, y los clientes de esos pisos.">
      <SelectorMultiple
        etiqueta="Zonas"
        opciones={zonas.map((z) => ({ id: z.id, label: z.nombre, color: z.color }))}
        value={value}
        onChange={onChange}
        vacio="Aún no hay zonas. Créalas en Zonas."
      />
    </Field>
  );
}

export function NuevoUsuarioButton({ zonas }: { zonas: OpcionZona[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <UserPlus /> Añadir persona
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          {open && <NuevoUsuarioForm zonas={zonas} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NuevoUsuarioForm({ zonas, onClose }: { zonas: OpcionZona[]; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolUsuario>("ASESOR");
  const [zonaIds, setZonaIds] = useState<string[]>([]);
  const [password, setPassword] = useState(generarPasswordTemporal);
  const [errores, setErrores] = useState<Errores>({});
  const [creado, setCreado] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await crearUsuario({ nombre, email, rol, password, zonaIds: rol === "ASESOR" ? zonaIds : [] });
      if (!result.success) {
        setErrores(result.error);
        return;
      }
      setCreado({ email: result.email, password: result.password });
      toast.success("Cuenta creada.");
    });
  }

  if (creado) {
    return (
      <div className="flex flex-col gap-5">
        <DialogHeader>
          <DialogTitle>Cuenta creada</DialogTitle>
          <DialogDescription>{nombre} ya puede entrar al CRM con estos datos.</DialogDescription>
        </DialogHeader>
        <Credenciales email={creado.email} password={creado.password} />
        <DialogFooter>
          <Button onClick={onClose}>Hecho</Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Añadir persona</DialogTitle>
        <DialogDescription>
          Entrará con una contraseña temporal y el CRM le pedirá cambiarla.
        </DialogDescription>
      </DialogHeader>

      <Field label="Nombre" htmlFor="u-nombre" error={errores.nombre?.[0]}>
        <Input
          id="u-nombre"
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Marta Ruiz"
          aria-invalid={!!errores.nombre}
        />
      </Field>
      <Field label="Email" htmlFor="u-email" hint="Con él iniciará sesión." error={errores.email?.[0]}>
        <Input
          id="u-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errores.email}
        />
      </Field>
      <RolField value={rol} onChange={setRol} error={errores.rol?.[0]} />
      {rol === "ASESOR" && <ZonasField zonas={zonas} value={zonaIds} onChange={setZonaIds} error={errores.zonaIds?.[0]} />}
      <Field
        label="Contraseña temporal"
        htmlFor="u-password"
        hint="Sugerida; puedes cambiarla."
        error={errores.password?.[0]}
      >
        <PasswordTemporalInput id="u-password" value={password} onChange={setPassword} invalid={!!errores.password} />
      </Field>

      <ErrorGeneral errores={errores} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear cuenta"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type UsuarioEditable = { id: string; nombre: string; rol: RolUsuario; esYo: boolean; zonaIds: string[] };

export function EditarUsuarioDialog({
  usuario,
  zonas,
  onClose,
}: {
  usuario: UsuarioEditable | null;
  zonas: OpcionZona[];
  onClose: () => void;
}) {
  return (
    <Dialog open={usuario !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {usuario && <EditarUsuarioForm usuario={usuario} zonas={zonas} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditarUsuarioForm({
  usuario,
  zonas,
  onClose,
}: {
  usuario: UsuarioEditable;
  zonas: OpcionZona[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<RolUsuario>(usuario.rol);
  const [zonaIds, setZonaIds] = useState<string[]>(usuario.zonaIds);
  const [errores, setErrores] = useState<Errores>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await editarUsuario(usuario.id, { nombre, rol, zonaIds: rol === "ASESOR" ? zonaIds : [] });
      if (!result.success) {
        setErrores(result.error);
        return;
      }
      toast.success("Cambios guardados.");
      onClose();
      // Without the director role this page no longer exists for them.
      if (usuario.esYo && rol !== "DIRECTOR") router.push("/");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Editar a {usuario.nombre}</DialogTitle>
        <DialogDescription>
          {usuario.esYo
            ? "Si dejas de ser director perderás el acceso a esta pantalla."
            : "El cambio de rol se aplica en su siguiente acción."}
        </DialogDescription>
      </DialogHeader>
      <Field label="Nombre" htmlFor="e-nombre" error={errores.nombre?.[0]}>
        <Input id="e-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={!!errores.nombre} />
      </Field>
      <RolField value={rol} onChange={setRol} error={errores.rol?.[0]} />
      {rol === "ASESOR" && <ZonasField zonas={zonas} value={zonaIds} onChange={setZonaIds} error={errores.zonaIds?.[0]} />}
      <ErrorGeneral errores={errores} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
