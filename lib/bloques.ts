import type { DbOficina } from "@/lib/db";
import { RESUMEN_VACIO, type ResumenOcupacion } from "@/lib/validations/bloque";

/**
 * Occupancy breakdown and potential-acquisition count per block, in two
 * grouped queries instead of loading every flat.
 */
export async function resumenPorBloque(db: DbOficina, bloqueIds: string[]) {
  const [ocupacion, potenciales] = await Promise.all([
    db.inmueble.groupBy({
      by: ["bloqueId", "ocupacion"],
      where: { bloqueId: { in: bloqueIds } },
      _count: { _all: true },
    }),
    db.inmueble.groupBy({
      by: ["bloqueId"],
      where: { bloqueId: { in: bloqueIds }, adquisicionPotencial: true },
      _count: { _all: true },
    }),
  ]);

  const resumen = new Map<string, { ocupacion: ResumenOcupacion; potenciales: number }>();
  for (const id of bloqueIds) resumen.set(id, { ocupacion: { ...RESUMEN_VACIO }, potenciales: 0 });

  for (const fila of ocupacion) {
    if (!fila.bloqueId) continue;
    resumen.get(fila.bloqueId)!.ocupacion[fila.ocupacion ?? "SIN_DATOS"] = fila._count._all;
  }
  for (const fila of potenciales) {
    if (!fila.bloqueId) continue;
    resumen.get(fila.bloqueId)!.potenciales = fila._count._all;
  }
  return resumen;
}
