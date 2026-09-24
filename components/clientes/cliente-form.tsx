"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { crearCliente, actualizarCliente } from "@/lib/actions/clientes";
import {
  clienteSchema,
  ordenarEtiquetas,
  TIPO_CLIENTE_LABELS,
  type ClienteInput,
  type EtiquetaCliente,
} from "@/lib/validations/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
} from "@/components/shared/form";
import { AsesorSelect } from "@/components/shared/asesor-select";
import type { Cliente } from "@/lib/generated/prisma/client";
import type { OpcionAsesor } from "@/lib/db";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * `asesores` is only passed to directors: it shows the advisor picker, which
 * starts on the current advisor (editing) or on `asesorInicial` (new client).
 */
export function ClienteForm({
  cliente,
  asesores,
  asesorInicial,
}: {
  cliente?: Cliente;
  asesores?: OpcionAsesor[];
  asesorInicial?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          dni: cliente.dni ?? "",
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          direccion: cliente.direccion ?? "",
          tipos: ordenarEtiquetas(cliente.tipos),
          notas: cliente.notas ?? "",
          fechaProximoContacto: toDateInputValue(cliente.fechaProximoContacto),
          ...(asesores ? { asesorId: cliente.asesorId ?? "" } : {}),
        }
      : {
          tipos: ["COMPRADOR"],
          ...(asesores ? { asesorId: asesorInicial ?? "" } : {}),
        },
  });

  async function onSubmit(data: ClienteInput) {
    const result = cliente
      ? await actualizarCliente(cliente.id, data)
      : await crearCliente(data);

    if (!result.success) {
      // Surface server errors (e.g. duplicate DNI) next to their field.
      for (const [campo, mensajes] of Object.entries(result.error)) {
        if (mensajes?.[0]) setError(campo as keyof ClienteInput, { message: mensajes[0] });
      }
      // Errors not tied to a field (e.g. the record was deleted meanwhile).
      const general = "_" in result.error ? result.error._?.[0] : undefined;
      toast.error(general ?? "Revisa los datos del formulario.");
      return;
    }

    toast.success(cliente ? "Cliente actualizado." : "Cliente creado.");
    router.push(`/clientes/${result.cliente.id}`);
    router.refresh();
  }

  return (
    <FormShell onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-4xl">
      <FormSection title="Identidad" description="Cómo aparecerá el cliente en listados y búsquedas.">
        <Field label="Nombre" htmlFor="nombre" error={errors.nombre?.message}>
          <Input
            id="nombre"
            autoComplete="off"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? "nombre-error" : undefined}
            {...register("nombre")}
          />
        </Field>
        <Field label="Apellidos" htmlFor="apellidos" error={errors.apellidos?.message}>
          <Input
            id="apellidos"
            autoComplete="off"
            aria-invalid={!!errors.apellidos}
            aria-describedby={errors.apellidos ? "apellidos-error" : undefined}
            {...register("apellidos")}
          />
        </Field>
        <Field label="DNI / NIE" htmlFor="dni" optional error={errors.dni?.message} hint="Se comprueba la letra de control.">
          <Input
            id="dni"
            autoComplete="off"
            placeholder="12345678Z"
            className="font-mono uppercase placeholder:normal-case"
            aria-invalid={!!errors.dni}
            aria-describedby={errors.dni ? "dni-error" : undefined}
            {...register("dni")}
          />
        </Field>
        <Field
          label="Etiquetas"
          className="sm:col-span-2"
          error={errors.tipos?.message}
          hint="Marca todas las que apliquen. «Propietario» se añade sola al asignarle un inmueble."
        >
          <Controller
            control={control}
            name="tipos"
            render={({ field }) => (
              <SelectorEtiquetas value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </Field>
      </FormSection>

      <FormSection title="Contacto" description="Teléfono o email para poder llamar o escribir al cliente.">
        <Field label="Teléfono" htmlFor="telefono" optional>
          <Input id="telefono" type="tel" inputMode="tel" placeholder="612 345 678" {...register("telefono")} />
        </Field>
        <Field label="Email" htmlFor="email" optional error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="nombre@correo.es"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </Field>
        <Field label="Dirección" htmlFor="direccion" optional className="sm:col-span-2">
          <Input id="direccion" {...register("direccion")} />
        </Field>
      </FormSection>

      <FormSection title="Seguimiento" description="La fecha de próximo contacto hace que el cliente aparezca en el panel cuando toque.">
        <Field
          label="Próximo contacto"
          htmlFor="fechaProximoContacto"
          optional
          hint="Déjalo vacío si no hay nada programado."
        >
          <Input id="fechaProximoContacto" type="date" {...register("fechaProximoContacto")} />
        </Field>
        {asesores && (
          <Field
            label="Asesor responsable"
            error={errors.asesorId?.message}
            hint="Quién lleva a este cliente."
          >
            <Controller
              control={control}
              name="asesorId"
              render={({ field }) => (
                <AsesorSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  asesores={asesores}
                  invalid={!!errors.asesorId}
                />
              )}
            />
          </Field>
        )}
        <Field label="Notas" htmlFor="notas" optional className="sm:col-span-2">
          <Textarea
            id="notas"
            rows={4}
            placeholder="Qué busca, presupuesto, disponibilidad para visitas…"
            {...register("notas")}
          />
        </Field>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : cliente ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </FormActions>
    </FormShell>
  );
}

function SelectorEtiquetas({
  value,
  onChange,
}: {
  value: EtiquetaCliente[];
  onChange: (tipos: EtiquetaCliente[]) => void;
}) {
  return (
    <div role="group" aria-label="Etiquetas" className="flex flex-wrap gap-2">
      {(Object.entries(TIPO_CLIENTE_LABELS) as [EtiquetaCliente, string][]).map(([etiqueta, texto]) => {
        const marcada = value.includes(etiqueta);
        return (
          <label
            key={etiqueta}
            className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color,border-color,box-shadow] duration-200 hover:text-foreground has-checked:border-primary/40 has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/40"
          >
            <input
              type="checkbox"
              checked={marcada}
              onChange={() =>
                onChange(ordenarEtiquetas(marcada ? value.filter((v) => v !== etiqueta) : [...value, etiqueta]))
              }
              className="size-4 accent-primary"
            />
            {texto}
          </label>
        );
      })}
    </div>
  );
}
