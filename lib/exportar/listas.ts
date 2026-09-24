import "server-only";
import type { NextRequest } from "next/server";

import { getContextoApi } from "@/lib/db";
import { resumenPorBloque } from "@/lib/bloques";
import { consultaBloques, consultaClientes, consultaInmuebles } from "@/lib/filtros/consultas";
import { ordenarEtiquetas, TIPO_CLIENTE_LABELS } from "@/lib/validations/cliente";
import {
  ESTADO_INMUEBLE_LABELS,
  TIPO_INMUEBLE_LABELS,
  TIPO_OPERACION_LABELS,
  formatUbicacion,
  ocupacionLabel,
} from "@/lib/validations/inmueble";
import {
  fecha,
  FORMATO_EUROS,
  LIMITE_EXPORTACION,
  numero,
  respuestaError,
  respuestaExcel,
  texto,
} from "@/lib/exportar/excel";

type Entidad = "clientes" | "inmuebles" | "bloques";

/**
 * GET handler shared by the three lists: same filters and order as the page
 * (read from the query string), scoped to the user's office, director only.
 */
export async function exportar(request: NextRequest, entidad: Entidad) {
  const ctx = await getContextoApi();
  if (!ctx) return respuestaError(401, "Inicia sesión para exportar.");
  if (!ctx.esDirector) return respuestaError(403, "Solo el director de la oficina puede exportar.");

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const { db } = ctx;
  const demasiadas = (total: number) =>
    total > LIMITE_EXPORTACION
      ? respuestaError(
          413,
          `Hay ${total} registros con estos filtros; el máximo por archivo es ${LIMITE_EXPORTACION}. Añade algún filtro y vuelve a exportar.`
        )
      : null;

  if (entidad === "clientes") {
    const { where, orderBy } = consultaClientes(sp);
    const error = demasiadas(await db.cliente.count({ where }));
    if (error) return error;
    const filas = await db.cliente.findMany({
      where,
      orderBy,
      include: { asesor: { select: { nombre: true } }, creadoPor: { select: { nombre: true } } },
    });
    type F = (typeof filas)[number];
    return respuestaExcel<F>(
      filas,
      [
        texto("Nombre", (c) => c.nombre),
        texto("Apellidos", (c) => c.apellidos, 24),
        texto("DNI / NIE", (c) => c.dni, 12),
        texto("Teléfono", (c) => c.telefono, 14),
        texto("Email", (c) => c.email, 26),
        texto("Dirección", (c) => c.direccion, 28),
        texto("Etiquetas", (c) => ordenarEtiquetas(c.tipos).map((e) => TIPO_CLIENTE_LABELS[e]).join(", "), 22),
        texto("Asesor", (c) => c.asesor?.nombre),
        fecha("Próximo contacto", (c) => c.fechaProximoContacto),
        fecha("Último contacto", (c) => c.fechaUltimoContacto, true),
        texto("Notas", (c) => c.notas, 40),
        fecha("Alta", (c) => c.createdAt, true),
        texto("Alta por", (c) => c.creadoPor?.nombre),
      ],
      "clientes"
    );
  }

  if (entidad === "inmuebles") {
    const { where, orderBy } = consultaInmuebles(sp);
    const error = demasiadas(await db.inmueble.count({ where }));
    if (error) return error;
    const filas = await db.inmueble.findMany({
      where,
      orderBy,
      include: {
        bloque: { select: { calle: true, numero: true } },
        propietario: { select: { nombre: true, apellidos: true, telefono: true } },
        asesor: { select: { nombre: true } },
        creadoPor: { select: { nombre: true } },
      },
    });
    type F = (typeof filas)[number];
    return respuestaExcel<F>(
      filas,
      [
        texto("Referencia", (i) => i.referencia, 12),
        texto("Dirección", (i) => i.direccion, 28),
        texto("Escalera · planta · puerta", (i) => formatUbicacion(i), 20),
        texto("Localidad", (i) => i.localidad),
        texto("Bloque", (i) => (i.bloque ? `${i.bloque.calle} ${i.bloque.numero}` : null), 22),
        texto("Tipo", (i) => TIPO_INMUEBLE_LABELS[i.tipoInmueble], 10),
        texto("Operación", (i) => TIPO_OPERACION_LABELS[i.tipoOperacion], 10),
        numero("Precio", (i) => Number(i.precio), 14, FORMATO_EUROS),
        texto("Estado", (i) => ESTADO_INMUEBLE_LABELS[i.estado], 11),
        numero("m²", (i) => i.metrosCuadrados, 7),
        numero("Habitaciones", (i) => i.habitaciones, 8),
        numero("Baños", (i) => i.banos, 7),
        texto("Ocupación", (i) => ocupacionLabel(i.ocupacion), 12),
        texto("Adquisición potencial", (i) => (i.adquisicionPotencial ? "Sí" : "No"), 10),
        fecha("Fin del alquiler", (i) => i.fechaFinAlquiler),
        fecha("Próximo contacto", (i) => i.fechaProximoContacto),
        texto("Propietario", (i) => (i.propietario ? `${i.propietario.nombre} ${i.propietario.apellidos}` : null), 24),
        texto("Teléfono propietario", (i) => i.propietario?.telefono, 14),
        texto("Asesor", (i) => i.asesor?.nombre),
        fecha("Último contacto", (i) => i.fechaUltimoContacto, true),
        texto("Descripción", (i) => i.descripcion, 40),
        fecha("Alta", (i) => i.createdAt, true),
        texto("Alta por", (i) => i.creadoPor?.nombre),
      ],
      "inmuebles"
    );
  }

  const { where, orderBy } = consultaBloques(sp);
  const error = demasiadas(await db.bloque.count({ where }));
  if (error) return error;
  const bloques = await db.bloque.findMany({
    where,
    orderBy,
    include: { _count: { select: { inmuebles: true } }, creadoPor: { select: { nombre: true } } },
  });
  const resumen = await resumenPorBloque(db, bloques.map((b) => b.id));
  const filas = bloques.map((b) => ({ ...b, resumen: resumen.get(b.id)! }));
  type F = (typeof filas)[number];
  return respuestaExcel<F>(
    filas,
    [
      texto("Calle", (b) => b.calle, 26),
      texto("Número", (b) => b.numero, 8),
      texto("Localidad", (b) => b.localidad),
      texto("Nombre", (b) => b.nombre),
      texto("Código postal", (b) => b.codigoPostal, 9),
      numero("Pisos", (b) => b._count.inmuebles, 7),
      numero("Con inquilinos", (b) => b.resumen.ocupacion.INQUILINOS),
      numero("Vive el propietario", (b) => b.resumen.ocupacion.PROPIETARIO),
      numero("Vacíos", (b) => b.resumen.ocupacion.VACIO),
      numero("Sin datos", (b) => b.resumen.ocupacion.SIN_DATOS),
      numero("Adquisiciones potenciales", (b) => b.resumen.potenciales, 12),
      texto("Notas", (b) => b.notas, 40),
      fecha("Alta", (b) => b.createdAt, true),
      texto("Alta por", (b) => b.creadoPor?.nombre),
    ],
    "bloques"
  );
}
