"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { crearInmueble, actualizarInmueble } from "@/lib/actions/inmuebles";
import {
  inmuebleSchema,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  ESTADO_INMUEBLE_LABELS,
  type InmuebleInput,
} from "@/lib/validations/inmueble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientePicker } from "@/components/shared/cliente-picker";
import {
  AffixInput,
  Field,
  FormActions,
  FormSection,
  FormShell,
  Segmented,
} from "@/components/shared/form";
import type { Inmueble } from "@/lib/generated/prisma/client";

// `precio` es un Decimal de Prisma, no serializable al cruzar de Server a
// Client Component: el llamador debe convertirlo a string antes de pasarlo.
export type InmuebleParaFormulario = Omit<Inmueble, "precio"> & { precio: string };

export function InmuebleForm({
  inmueble,
  propietarioInicial,
}: {
  inmueble?: InmuebleParaFormulario;
  propietarioInicial?: { id: string; label: string } | null;
}) {
  const router = useRouter();
  const [propietario, setPropietario] = useState<{ id: string; label: string } | null>(
    propietarioInicial ?? null
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InmuebleInput>({
    resolver: zodResolver(inmuebleSchema),
    defaultValues: inmueble
      ? {
          referencia: inmueble.referencia,
          direccion: inmueble.direccion,
          localidad: inmueble.localidad,
          tipoInmueble: inmueble.tipoInmueble,
          tipoOperacion: inmueble.tipoOperacion,
          precio: inmueble.precio,
          metrosCuadrados: inmueble.metrosCuadrados?.toString() ?? "",
          habitaciones: inmueble.habitaciones?.toString() ?? "",
          banos: inmueble.banos?.toString() ?? "",
          descripcion: inmueble.descripcion ?? "",
          estado: inmueble.estado,
          propietarioId: inmueble.propietarioId ?? "",
        }
      : {
          tipoInmueble: "PISO",
          tipoOperacion: "VENTA",
          estado: "DISPONIBLE",
        },
  });

  async function onSubmit(data: InmuebleInput) {
    const payload = { ...data, propietarioId: propietario?.id ?? "" };

    const result = inmueble
      ? await actualizarInmueble(inmueble.id, payload)
      : await crearInmueble(payload);

    if (!result.success) {
      const primerError = Object.values(result.error).flat()[0];
      toast.error(primerError ?? "Revisa los datos del formulario.");
      return;
    }

    toast.success(inmueble ? "Inmueble actualizado." : "Inmueble creado.");
    router.push(`/inmuebles/${result.inmuebleId}`);
    router.refresh();
  }

  return (
    <FormShell onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-4xl">
      <FormSection title="Ubicación" description="La referencia es el código interno con el que se busca el inmueble.">
        <Field label="Referencia" htmlFor="referencia" error={errors.referencia?.message}>
          <Input
            id="referencia"
            autoComplete="off"
            className="font-mono"
            aria-invalid={!!errors.referencia}
            aria-describedby={errors.referencia ? "referencia-error" : undefined}
            {...register("referencia")}
          />
        </Field>
        <Field label="Localidad" htmlFor="localidad" error={errors.localidad?.message}>
          <Input
            id="localidad"
            aria-invalid={!!errors.localidad}
            aria-describedby={errors.localidad ? "localidad-error" : undefined}
            {...register("localidad")}
          />
        </Field>
        <Field label="Dirección" htmlFor="direccion" error={errors.direccion?.message} className="sm:col-span-2">
          <Input
            id="direccion"
            placeholder="Calle, número, piso y puerta"
            aria-invalid={!!errors.direccion}
            aria-describedby={errors.direccion ? "direccion-error" : undefined}
            {...register("direccion")}
          />
        </Field>
      </FormSection>

      <FormSection title="Comercialización" description="Tipo de operación, precio de salida y situación actual.">
        <Field label="Operación">
          <Controller
            control={control}
            name="tipoOperacion"
            render={({ field }) => (
              <Segmented
                name="tipoOperacion"
                aria-label="Venta o alquiler"
                value={field.value}
                onChange={field.onChange}
                options={TIPO_OPERACION_LABELS}
              />
            )}
          />
        </Field>
        <Field
          label="Precio"
          htmlFor="precio"
          error={errors.precio?.message}
        >
          <AffixInput
            id="precio"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            suffix="€"
            aria-invalid={!!errors.precio}
            aria-describedby={errors.precio ? "precio-error" : undefined}
            {...register("precio")}
          />
        </Field>
        <Field label="Estado" className="sm:col-span-2">
          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <Segmented
                name="estado"
                aria-label="Estado"
                value={field.value}
                onChange={field.onChange}
                options={ESTADO_INMUEBLE_LABELS}
              />
            )}
          />
        </Field>
      </FormSection>

      <FormSection title="Características">
        <Field label="Tipo de inmueble">
          <Controller
            control={control}
            name="tipoInmueble"
            render={({ field }) => (
              <Select items={TIPO_INMUEBLE_LABELS} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-label="Tipo de inmueble">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_INMUEBLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Superficie" htmlFor="metrosCuadrados" optional>
          <AffixInput
            id="metrosCuadrados"
            type="number"
            min="0"
            inputMode="numeric"
            suffix="m²"
            {...register("metrosCuadrados")}
          />
        </Field>
        <Field label="Habitaciones" htmlFor="habitaciones" optional>
          <Input id="habitaciones" type="number" min="0" inputMode="numeric" className="tabular" {...register("habitaciones")} />
        </Field>
        <Field label="Baños" htmlFor="banos" optional>
          <Input id="banos" type="number" min="0" inputMode="numeric" className="tabular" {...register("banos")} />
        </Field>
        <Field label="Descripción" htmlFor="descripcion" optional className="sm:col-span-2">
          <Textarea
            id="descripcion"
            rows={5}
            placeholder="Orientación, estado de conservación, extras, comunidad…"
            {...register("descripcion")}
          />
        </Field>
      </FormSection>

      <FormSection title="Propietario" description="Cliente de la cartera que ha encargado la venta o el alquiler.">
        <Field label="Cliente propietario" optional className="sm:col-span-2">
          <ClientePicker
            value={propietario?.id ?? null}
            valueLabel={propietario?.label}
            onChange={setPropietario}
            placeholder="Buscar en clientes…"
          />
        </Field>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : inmueble ? "Guardar cambios" : "Crear inmueble"}
        </Button>
      </FormActions>
    </FormShell>
  );
}
