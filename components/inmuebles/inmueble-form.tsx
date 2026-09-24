"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { crearInmueble, actualizarInmueble } from "@/lib/actions/inmuebles";
import {
  inmuebleSchema,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  ESTADO_INMUEBLE_LABELS,
  OCUPACION_LABELS,
  ESCALERA_SUGERENCIAS,
  type InmuebleInput,
} from "@/lib/validations/inmueble";
import { formatBloque } from "@/lib/validations/bloque";
import { BloquePicker, type BloqueSeleccionado } from "@/components/shared/bloque-picker";
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
import { AsesorSelect } from "@/components/shared/asesor-select";
import type { Inmueble } from "@/lib/generated/prisma/client";
import type { OpcionAsesor } from "@/lib/db";

// `precio` es un Decimal de Prisma, no serializable al cruzar de Server a
// Client Component: el llamador debe convertirlo a string antes de pasarlo.
export type InmuebleParaFormulario = Omit<Inmueble, "precio"> & { precio: string };

const SI_NO = { SI: "Sí", NO: "No" } as const;

/**
 * `asesores` is only passed to directors: it shows the advisor picker, which
 * starts on the current advisor (editing) or on `asesorInicial` (new property).
 */
export function InmuebleForm({
  inmueble,
  propietarioInicial,
  bloqueInicial,
  asesores,
  asesorInicial,
}: {
  inmueble?: InmuebleParaFormulario;
  propietarioInicial?: { id: string; label: string } | null;
  bloqueInicial?: BloqueSeleccionado | null;
  asesores?: OpcionAsesor[];
  asesorInicial?: string;
}) {
  const router = useRouter();
  const [propietario, setPropietario] = useState<{ id: string; label: string } | null>(
    propietarioInicial ?? null
  );
  const [bloque, setBloque] = useState<BloqueSeleccionado | null>(bloqueInicial ?? null);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
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
          escalera: inmueble.escalera ?? "",
          planta: inmueble.planta?.toString() ?? "",
          puerta: inmueble.puerta ?? "",
          ocupacion: inmueble.ocupacion ?? "SIN_DATOS",
          adquisicionPotencial: inmueble.adquisicionPotencial,
          fechaFinAlquiler: inmueble.fechaFinAlquiler?.toISOString().slice(0, 10) ?? "",
          ...(asesores ? { asesorId: inmueble.asesorId ?? "" } : {}),
        }
      : {
          tipoInmueble: "PISO",
          tipoOperacion: "VENTA",
          estado: "DISPONIBLE",
          // Preselected block (e.g. «Añadir piso a este bloque»): start from its address.
          direccion: bloqueInicial ? formatBloque(bloqueInicial) : "",
          localidad: bloqueInicial?.localidad ?? "",
          ocupacion: "SIN_DATOS",
          adquisicionPotencial: false,
          ...(asesores ? { asesorId: asesorInicial ?? "" } : {}),
        },
  });

  // The lease end date only makes sense for a rented property; a hidden value is kept.
  const [ocupacionActual, estadoActual] = useWatch({ control, name: ["ocupacion", "estado"] });
  const conAlquiler = ocupacionActual === "INQUILINOS" || estadoActual === "ALQUILADO";

  function cambiarBloque(siguiente: BloqueSeleccionado | null) {
    // Prefill address/locality only when they are empty or still show the
    // previous block's values, so hand-typed text is never overwritten.
    const anteriorDireccion = bloque ? formatBloque(bloque) : "";
    if (siguiente) {
      const { direccion, localidad } = getValues();
      if (!direccion || direccion === anteriorDireccion) {
        setValue("direccion", formatBloque(siguiente), { shouldValidate: true });
      }
      if (!localidad || localidad === bloque?.localidad) {
        setValue("localidad", siguiente.localidad, { shouldValidate: true });
      }
    }
    setBloque(siguiente);
  }

  async function onSubmit(data: InmuebleInput) {
    const payload = {
      ...data,
      propietarioId: propietario?.id ?? "",
      bloqueId: bloque?.id ?? "",
    };

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
      <FormSection
        title="Ubicación"
        description="La referencia es el código interno con el que se busca el inmueble. El bloque agrupa los pisos del mismo edificio."
      >
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
        <Field label="Bloque" optional className="sm:col-span-2" hint="Al elegirlo se rellenan la dirección y la localidad.">
          <BloquePicker value={bloque} onChange={cambiarBloque} obtenerLocalidad={() => getValues("localidad")} />
        </Field>
        <Field label="Dirección" htmlFor="direccion" error={errors.direccion?.message} className="sm:col-span-2">
          <Input
            id="direccion"
            placeholder="Calle y número"
            aria-invalid={!!errors.direccion}
            aria-describedby={errors.direccion ? "direccion-error" : undefined}
            {...register("direccion")}
          />
        </Field>
        <div className="grid grid-cols-3 gap-4 sm:col-span-2">
          <Field label="Escalera" htmlFor="escalera" optional>
            <Input id="escalera" list="escaleras" autoComplete="off" {...register("escalera")} />
            <datalist id="escaleras">
              {ESCALERA_SUGERENCIAS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </Field>
          <Field label="Planta" htmlFor="planta" optional error={errors.planta?.message} hint="0 = Bajo">
            <Input
              id="planta"
              type="number"
              step="1"
              inputMode="numeric"
              className="tabular"
              aria-invalid={!!errors.planta}
              aria-describedby={errors.planta ? "planta-error" : undefined}
              {...register("planta")}
            />
          </Field>
          <Field label="Puerta" htmlFor="puerta" optional>
            <Input id="puerta" autoComplete="off" placeholder="B" {...register("puerta")} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Situación"
        description="Quién vive ahora en el inmueble y si es una posible captación."
      >
        <Field label="Ocupación" className="sm:col-span-2">
          <Controller
            control={control}
            name="ocupacion"
            render={({ field }) => (
              <Segmented
                name="ocupacion"
                aria-label="Ocupación"
                value={field.value}
                onChange={field.onChange}
                options={OCUPACION_LABELS}
              />
            )}
          />
        </Field>
        {conAlquiler && (
          <Field
            label="Fin del alquiler"
            htmlFor="fechaFinAlquiler"
            optional
            error={errors.fechaFinAlquiler?.message}
            hint="Aparecerá en el panel y en el calendario cuando se acerque."
          >
            <Input
              id="fechaFinAlquiler"
              type="date"
              aria-invalid={!!errors.fechaFinAlquiler}
              {...register("fechaFinAlquiler")}
            />
          </Field>
        )}
        <Field label="Adquisición potencial" hint="Marca los pisos que podrían captarse para la cartera.">
          <Controller
            control={control}
            name="adquisicionPotencial"
            render={({ field }) => (
              <Segmented
                name="adquisicionPotencial"
                aria-label="Adquisición potencial"
                value={field.value ? "SI" : "NO"}
                onChange={(v) => field.onChange(v === "SI")}
                options={SI_NO}
              />
            )}
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

      <FormSection
        title={asesores ? "Propietario y asesor" : "Propietario"}
        description="Cliente de la cartera que ha encargado la venta o el alquiler."
      >
        <Field label="Cliente propietario" optional className="sm:col-span-2">
          <ClientePicker
            value={propietario?.id ?? null}
            valueLabel={propietario?.label}
            onChange={setPropietario}
            placeholder="Buscar en clientes…"
          />
        </Field>
        {asesores && (
          <Field
            label="Asesor responsable"
            error={errors.asesorId?.message}
            hint="Quién lleva este inmueble."
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
