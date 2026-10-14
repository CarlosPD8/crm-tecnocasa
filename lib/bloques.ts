import type { DbOficina } from "@/lib/db";
import { RESUMEN_VACIO, type ResumenOcupacion } from "@/lib/validations/bloque";

/**
 * Occupancy breakdown and acquisition marks (potential / news) per block, in
 * two grouped queries instead of loading every flat.
 */
export async function resumenPorBloque(db: DbOficina, bloqueIds: string[]) {
  const [ocupacion, captacion] = await Promise.all([
    db.inmueble.groupBy({
      by: ["bloqueId", "ocupacion"],
      where: { bloqueId: { in: bloqueIds } },
      _count: { _all: true },
    }),
    db.inmueble.groupBy({
      by: ["bloqueId", "captacion"],
      where: { bloqueId: { in: bloqueIds }, captacion: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const resumen = new Map<string, { ocupacion: ResumenOcupacion; potenciales: number; noticias: number }>();
  for (const id of bloqueIds) resumen.set(id, { ocupacion: { ...RESUMEN_VACIO }, potenciales: 0, noticias: 0 });

  for (const fila of ocupacion) {
    if (!fila.bloqueId) continue;
    resumen.get(fila.bloqueId)!.ocupacion[fila.ocupacion ?? "SIN_DATOS"] = fila._count._all;
  }
  for (const fila of captacion) {
    if (!fila.bloqueId) continue;
    resumen.get(fila.bloqueId)![fila.captacion === "NOTICIA" ? "noticias" : "potenciales"] = fila._count._all;
  }
  return resumen;
}
