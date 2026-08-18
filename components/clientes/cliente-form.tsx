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
    <Card className="max-w-2xl">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...register("nombre")} />
              {errors.nombre && (
                <p className="text-sm text-destructive">{errors.nombre.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input id="apellidos" {...register("apellidos")} />
              {errors.apellidos && (
                <p className="text-sm text-destructive">{errors.apellidos.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" {...register("telefono")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register("direccion")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo de cliente</Label>
              <Controller
                control={control}
                name="tipoCliente"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_CLIENTE_LABELS).map(([value, label]) => (
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
              <Label htmlFor="fechaProximoContacto">Próximo contacto</Label>
              <Input
                id="fechaProximoContacto"
                type="date"
                {...register("fechaProximoContacto")}
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" rows={4} {...register("notas")} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
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
