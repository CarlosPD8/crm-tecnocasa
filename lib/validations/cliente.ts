import { z } from "zod";

/**
 * Client tags; a client can carry several. «Vendedor» is gone: an owner whose
 * property is for sale is the seller. The legacy "VENDEDOR" enum value stays in
 * the database until the contract migration and is never offered.
 */
export const TIPO_CLIENTE_LABELS = {
  COMPRADOR: "Comprador",
  INQUILINO: "Inquilino",
  PROPIETARIO: "Propietario",
} as const;

export type EtiquetaCliente = keyof typeof TIPO_CLIENTE_LABELS;

const ETIQUETAS = Object.keys(TIPO_CLIENTE_LABELS) as [EtiquetaCliente, ...EtiquetaCliente[]];

/** Known tags in display order (drops legacy values). */
export function ordenarEtiquetas(tipos: readonly string[]): EtiquetaCliente[] {
  return ETIQUETAS.filter((e) => tipos.includes(e));
}

const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

/** «12.345.678-z» → «12345678Z». */
export function normalizarDni(valor: string) {
  return valor.replace(/[\s.\-]/g, "").toUpperCase();
}

/** Spanish DNI (8 digits + letter) or NIE (X/Y/Z + 7 digits + letter), with control letter check. */
export function dniValido(valor: string) {
  const dni = normalizarDni(valor);
  const match = /^([XYZ]\d{7}|\d{8})([A-Z])$/.exec(dni);
  if (!match) return false;
  const numero = Number(match[1].replace("X", "0").replace("Y", "1").replace("Z", "2"));
  return LETRAS_DNI[numero % 23] === match[2];
}

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  dni: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || dniValido(v), "DNI o NIE no válido (revisa números y letra)"),
  telefono: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
  tipos: z.array(z.enum(ETIQUETAS)).min(1, "Elige al menos una etiqueta"),
  notas: z.string().optional().or(z.literal("")),
  fechaProximoContacto: z.string().optional().or(z.literal("")),
  // Only directors send it; "" = no advisor. Ignored for advisors (see resolverAsesor).
  asesorId: z.string().optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

