"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { crearCliente, actualizarCliente } from "@/lib/actions/clientes";
import {
  clienteSchema,
  TIPO_CLIENTE_LABELS,
  type ClienteInput,
} from "@/lib/validations/cliente";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FormActions,
  FormSection,
  FormShell,
  Segmented,
} from "@/components/shared/form";
import type { Cliente } from "@/lib/generated/prisma/client";

function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          apellidos: cliente.apellidos,
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          direccion: cliente.direccion ?? "",
          tipoCliente: cliente.tipoCliente,
          notas: cliente.notas ?? "",
          fechaProximoContacto: toDateInputValue(cliente.fechaProximoContacto),
        }
      : {
          tipoCliente: "COMPRADOR",
        },
  });

  async function onSubmit(data: ClienteInput) {
    const result = cliente
      ? await actualizarCliente(cliente.id, data)
      : await crearCliente(data);

    if (!result.success) {
      toast.error("Revisa los datos del formulario.");
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
        <Field label="Tipo de cliente" className="sm:col-span-2">
          <Controller
            control={control}
            name="tipoCliente"
            render={({ field }) => (
              <Segmented
                name="tipoCliente"
                aria-label="Tipo de cliente"
                value={field.value}
                onChange={field.onChange}
                options={TIPO_CLIENTE_LABELS}
              />
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
