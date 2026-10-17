"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { crearBloque, actualizarBloque } from "@/lib/actions/bloques";
import { bloqueSchema, type BloqueInput } from "@/lib/validations/bloque";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormActions, FormSection, FormShell } from "@/components/shared/form";
import { ZonaSelect } from "@/components/zonas/zona-select";
import { ZonaBadge } from "@/components/zonas/zona-badge";
import { AvisoUbicacion } from "@/components/ubicacion/aviso-ubicacion";
import { useLugar } from "@/components/ubicacion/ubicacion-provider";
import type { Bloque } from "@/lib/generated/prisma/client";
import type { OpcionZona } from "@/lib/db";

/**
 * `zonas`: the ones the user can pick. When editing, only a director changes
 * the zone; an advisor sees it read-only.
 */
export function BloqueForm({
  bloque,
  zonas,
  esDirector,
}: {
  bloque?: Bloque & { zona: { nombre: string; color: string } | null };
  zonas: OpcionZona[];
  esDirector: boolean;
}) {
  const router = useRouter();
  const lugar = useLugar({ alAbrir: true });
  const puedeCambiarZona = !bloque || esDirector;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BloqueInput>({
    resolver: zodResolver(bloqueSchema),
    defaultValues: bloque
      ? {
          calle: bloque.calle,
          numero: bloque.numero,
          localidad: bloque.localidad,
          nombre: bloque.nombre ?? "",
          codigoPostal: bloque.codigoPostal ?? "",
          notas: bloque.notas ?? "",
          zonaId: bloque.zonaId,
        }
      : // With a single zone there's nothing to choose.
        { zonaId: zonas.length === 1 ? zonas[0].id : "" },
  });

  async function onSubmit(data: BloqueInput) {
    const result = await lugar.guardar(async (ub) =>
      bloque ? await actualizarBloque(bloque.id, data, ub) : await crearBloque(data, ub)
    );
    if (!result) return;

    if (!result.success) {
      // Surface server errors (e.g. duplicate address) on their fields.
      for (const [campo, mensajes] of Object.entries(result.error)) {
        if (mensajes?.[0]) setError(campo as keyof BloqueInput, { message: mensajes[0] });
      }
      // Errors not tied to a field (e.g. the record was deleted meanwhile).
      const general = "_" in result.error ? result.error._?.[0] : undefined;
      toast.error(general ?? "Revisa los datos del formulario.");
      return;
    }

    toast.success(bloque ? "Bloque actualizado." : "Bloque creado.");
    router.push(`/bloques/${"bloque" in result ? result.bloque.id : result.bloqueId}`);
    router.refresh();
  }

  return (
    <FormShell onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-4xl">
      <AvisoUbicacion lugar={lugar} className="mt-4" />
      <FormSection
        title="Dirección"
        description="Calle, número y localidad identifican el edificio: no puede haber dos bloques con la misma dirección."
      >
        <Field label="Calle" htmlFor="calle" error={errors.calle?.message}>
          <Input
            id="calle"
            placeholder="C/ Estrellas"
            aria-invalid={!!errors.calle}
            aria-describedby={errors.calle ? "calle-error" : undefined}
            {...register("calle")}
          />
        </Field>
        <Field label="Número" htmlFor="numero" error={errors.numero?.message}>
          <Input
            id="numero"
            placeholder="22"
            aria-invalid={!!errors.numero}
            aria-describedby={errors.numero ? "numero-error" : undefined}
            {...register("numero")}
          />
        </Field>
        <Field label="Localidad" htmlFor="localidad" error={errors.localidad?.message}>
          <Input
            id="localidad"
            placeholder="Granada (Zaidín)"
            aria-invalid={!!errors.localidad}
            aria-describedby={errors.localidad ? "localidad-error" : undefined}
            {...register("localidad")}
          />
        </Field>
        <Field label="Código postal" htmlFor="codigoPostal" optional>
          <Input id="codigoPostal" inputMode="numeric" className="tabular" {...register("codigoPostal")} />
        </Field>
      </FormSection>

      <FormSection title="Zona" description="Sus pisos están siempre en la zona del bloque.">
        {puedeCambiarZona ? (
          <Field
            label="Zona"
            htmlFor="zonaId"
            error={errors.zonaId?.message}
            hint={bloque ? "Al cambiarla, sus pisos pasan también a la nueva zona." : undefined}
          >
            <Controller
              control={control}
              name="zonaId"
              render={({ field }) => (
                <ZonaSelect
                  id="zonaId"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  zonas={zonas}
                  invalid={!!errors.zonaId}
                />
              )}
            />
          </Field>
        ) : (
          <Field label="Zona" hint="Solo el director cambia la zona de un bloque.">
            <ZonaBadge zona={bloque?.zona} className="h-9 text-sm" />
          </Field>
        )}
      </FormSection>

      <FormSection title="Detalles">
        <Field label="Nombre del edificio" htmlFor="nombre" optional className="sm:col-span-2">
          <Input id="nombre" placeholder="Residencial Los Álamos" {...register("nombre")} />
        </Field>
        <Field label="Notas" htmlFor="notas" optional className="sm:col-span-2">
          <Textarea
            id="notas"
            rows={4}
            placeholder="Presidente de la comunidad, portero, ascensor, estado de la fachada…"
            {...register("notas")}
          />
        </Field>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSubmitting || lugar.bloqueado}>
          {isSubmitting ? "Guardando…" : bloque ? "Guardar cambios" : "Crear bloque"}
        </Button>
      </FormActions>
    </FormShell>
  );
}
