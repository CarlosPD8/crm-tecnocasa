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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClientePicker } from "@/components/shared/cliente-picker";
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
    <Card className="max-w-3xl">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="referencia">Referencia</Label>
              <Input id="referencia" {...register("referencia")} />
              {errors.referencia && (
                <p className="text-sm text-destructive">{errors.referencia.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="localidad">Localidad</Label>
              <Input id="localidad" {...register("localidad")} />
              {errors.localidad && (
                <p className="text-sm text-destructive">{errors.localidad.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register("direccion")} />
              {errors.direccion && (
                <p className="text-sm text-destructive">{errors.direccion.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de inmueble</Label>
              <Controller
                control={control}
                name="tipoInmueble"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
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
            </div>

            <div className="flex flex-col gap-2">
              <Label>Venta o alquiler</Label>
              <Controller
                control={control}
                name="tipoOperacion"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_OPERACION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="precio">Precio (€)</Label>
              <Input id="precio" type="number" step="0.01" min="0" {...register("precio")} />
              {errors.precio && (
                <p className="text-sm text-destructive">{errors.precio.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Controller
                control={control}
                name="estado"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESTADO_INMUEBLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="metrosCuadrados">Metros cuadrados</Label>
              <Input id="metrosCuadrados" type="number" min="0" {...register("metrosCuadrados")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="habitaciones">Habitaciones</Label>
              <Input id="habitaciones" type="number" min="0" {...register("habitaciones")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="banos">Baños</Label>
              <Input id="banos" type="number" min="0" {...register("banos")} />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>Propietario</Label>
              <ClientePicker
                value={propietario?.id ?? null}
                valueLabel={propietario?.label}
                onChange={setPropietario}
                placeholder="Sin propietario asignado"
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" rows={4} {...register("descripcion")} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
