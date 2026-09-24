// Datos de demostración (Granada capital) de la oficina «Demo» (ofi_demo). BORRA
// sus bloques, clientes, inmuebles, contactos, intereses, operaciones, eventos y
// registros de archivos antes de insertar. Las demás oficinas no se tocan: todo
// pasa por la misma extensión de ámbito que usa la app (lib/ambito-oficina.ts).
// Uso: SEED_CONFIRMAR=demo npx prisma db seed
//
// Las fechas son relativas a hoy, así que la demo tiene sentido cualquier día:
// siempre hay contactos vencidos, para hoy y próximos, y operaciones recientes.

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { extensionOficina } from "../lib/ambito-oficina";
import type {
  EstadoInmueble,
  Ocupacion,
  TipoCliente,
  TipoInmueble,
  TipoOperacion,
} from "../lib/generated/prisma/enums";

// The seed deletes data: refuse to run unless explicitly confirmed, and say where.
const destino = (() => {
  try {
    return new URL(process.env.DIRECT_URL ?? "").host;
  } catch {
    return "(DIRECT_URL no válida)";
  }
})();
if (process.env.SEED_CONFIRMAR !== "demo") {
  console.error(
    `El seed borra y recrea los datos de demostración en ${destino}.\n` +
      `Si es lo que quieres: SEED_CONFIRMAR=demo npx prisma db seed`
  );
  process.exit(1);
}
console.log(`Seed sobre ${destino}`);

const OFICINA_DEMO = "ofi_demo";

const base = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
});

function clienteDemo(usuarioId: string) {
  return base.$extends(extensionOficina(OFICINA_DEMO, usuarioId));
}

// Scoped to the demo office; assigned in main() once its director is known.
let prisma: ReturnType<typeof clienteDemo>;

const DAY = 24 * 60 * 60 * 1000;
/** Fecha a `dias` de hoy (negativo = pasado), a una hora de oficina concreta. */
function dia(dias: number, hora = 10, minuto = 0) {
  const d = new Date(Date.now() + dias * DAY);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

// ─── Bloques ─────────────────────────────────────────────────────────────────

const BLOQUES = [
  {
    key: "estrellas",
    calle: "C/ Estrellas",
    numero: "22",
    localidad: "Granada (Zaidín)",
    nombre: "Edificio Las Estrellas",
    codigoPostal: "18007",
    notas: "Dos escaleras (izquierda y derecha), ascensor reformado en 2022. Presidenta de la comunidad: vecina del 3º A izquierda.",
  },
  {
    key: "recogidas",
    calle: "C/ Recogidas",
    numero: "24",
    localidad: "Granada (Centro)",
    codigoPostal: "18005",
    notas: "Garaje en sótano con acceso por C/ Puentezuelas.",
  },
  {
    key: "salon",
    calle: "Paseo del Salón",
    numero: "12",
    localidad: "Granada (Centro)",
    nombre: "Edificio Genil",
    codigoPostal: "18009",
    notas: "Edificio señorial con portero de 8:00 a 15:00.",
  },
];

// ─── Clientes ────────────────────────────────────────────────────────────────
// Cubre los 4 tipos, contactos vencidos / hoy / próximos / sin fecha,
// y fichas con datos incompletos (sin email, sin teléfono, sin dirección).
// Un contacto con `ref` trata sobre ese inmueble y aparece en ambos historiales.

type ClienteSeed = {
  key: string;
  nombre: string;
  apellidos: string;
  tipo: TipoCliente;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
  proximo?: number; // días desde hoy
  contactos?: { dias: number; nota: string; ref?: string }[];
};

const CLIENTES: ClienteSeed[] = [
  {
    key: "lucia",
    nombre: "Lucía",
    apellidos: "Moreno Castillo",
    tipo: "COMPRADOR",
    telefono: "654 218 903",
    email: "lucia.moreno@example.com",
    direccion: "C/ Arabial 45, 3ºA, Granada",
    notas: "Busca piso de 3 dormitorios cerca del Camino de Ronda o Recogidas. Presupuesto hasta 240.000 €. Hipoteca preaprobada.",
    proximo: -3,
    contactos: [
      { dias: -18, nota: "Primera llamada. Le interesan pisos con ascensor y buena conexión con el metro." },
      { dias: -9, nota: "Visita al piso de Recogidas. Le gusta, pero ve la cocina pequeña.", ref: "GR-2401" },
      { dias: -3, nota: "Quedamos en llamarla hoy con la respuesta del propietario sobre la contraoferta." },
    ],
  },
  {
    key: "javier",
    nombre: "Javier",
    apellidos: "Ruiz Benítez",
    tipo: "COMPRADOR",
    telefono: "677 402 115",
    email: "jruizb@example.com",
    notas: "Inversor. Compra para alquilar a estudiantes. Prefiere pisos cerca de Fuentenueva o locales en el centro.",
    proximo: -1,
    contactos: [
      { dias: -12, nota: "Pide rentabilidad estimada del local de C/ San Juan de Dios.", ref: "GR-2404" },
      { dias: -1, nota: "Le envío el estudio de rentabilidad. Pendiente de respuesta." },
    ],
  },
  {
    key: "carmen",
    nombre: "Carmen",
    apellidos: "Jiménez Olmo",
    tipo: "INQUILINO",
    telefono: "611 930 227",
    email: "carmen.jolmo@example.com",
    notas: "Trabaja en el Parque Tecnológico de la Salud. Busca alquiler hasta 800 €/mes, con mascota (perro pequeño).",
    proximo: 0,
    contactos: [
      { dias: -6, nota: "Descarta el ático del Realejo por no admitir mascotas.", ref: "GR-2403" },
      { dias: -2, nota: "Interesada en el piso de C/ Estrellas. Visita programada para hoy.", ref: "GR-2405" },
    ],
  },
  {
    key: "antonio",
    nombre: "Antonio",
    apellidos: "Gallardo Pérez",
    tipo: "PROPIETARIO",
    telefono: "699 551 380",
    email: "a.gallardo@example.com",
    direccion: "Camino de Ronda 112, 5ºC, Granada",
    notas: "Vende el piso de Recogidas y el chalet de la Carretera de la Sierra. Se traslada a Málaga en tres meses.",
    proximo: 0,
    contactos: [
      { dias: -30, nota: "Firma de la nota de encargo en exclusiva de los dos inmuebles." },
      { dias: -4, nota: "Le informo de dos visitas al chalet esta semana. Acepta bajar a 400.000 € si hace falta.", ref: "GR-2402" },
    ],
  },
  {
    key: "rocio",
    nombre: "Rocío",
    apellidos: "Serrano Díaz",
    tipo: "COMPRADOR",
    telefono: "622 781 046",
    email: "rocio.serrano@example.com",
    notas: "Primera vivienda. Muy interesada en áticos con terraza en el Realejo o el Centro.",
    proximo: -5,
    contactos: [{ dias: -5, nota: "Pide que la llamemos en cuanto entre un ático con vistas a la Alhambra." }],
  },
  {
    key: "manuel",
    nombre: "Manuel",
    apellidos: "Ortega Ramos",
    tipo: "PROPIETARIO",
    telefono: "656 114 972",
    direccion: "C/ Palencia 20, 1ºB, Granada",
    notas: "Tiene tres pisos en el Edificio Las Estrellas (C/ Estrellas 22). Cobro por transferencia el día 5. Se plantea vender alguno.",
    proximo: 2,
    contactos: [
      { dias: -40, nota: "Renovación del encargo de gestión de los alquileres." },
      { dias: -8, nota: "Avisa de una avería en el calentador del 3º C derecha.", ref: "GR-2409" },
    ],
  },
  {
    key: "elena",
    nombre: "Elena",
    apellidos: "Navarro Luque",
    tipo: "COMPRADOR",
    telefono: "633 208 519",
    email: "elena.navarro@example.com",
    direccion: "Avda. de Cervantes 18, 2ºD, Granada",
    notas: "Compró el piso de Pedro Antonio de Alarcón. Posible interés futuro en una plaza de garaje.",
    proximo: 14,
    contactos: [
      { dias: -26, nota: "Firma de arras del piso de Pedro Antonio de Alarcón.", ref: "GR-2415" },
      { dias: -11, nota: "Firma en notaría. Entrega de llaves.", ref: "GR-2415" },
    ],
  },
  {
    key: "francisco",
    nombre: "Francisco",
    apellidos: "Romero Aguilar",
    tipo: "PROPIETARIO",
    telefono: "640 377 821",
    email: "fromero@example.com",
    notas: "Vende nave en el polígono de Almanjáyar. Precio negociable para venta rápida.",
    proximo: 4,
    contactos: [{ dias: -15, nota: "Reportaje de fotos y medición de la nave.", ref: "GR-2407" }],
  },
  {
    key: "isabel",
    nombre: "Isabel",
    apellidos: "Cano Fernández",
    tipo: "INQUILINO",
    telefono: "675 093 664",
    email: "isabel.cano@example.com",
    notas: "Alquiló el 1º B izquierda de C/ Estrellas 22. Contrato de un año con prórroga.",
    contactos: [{ dias: -22, nota: "Firma del contrato de alquiler y entrega de fianza.", ref: "GR-2418" }],
  },
  {
    key: "david",
    nombre: "David",
    apellidos: "Muñoz Vega",
    tipo: "COMPRADOR",
    telefono: "618 552 490",
    notas: "Sin email. Prefiere WhatsApp. Busca casa con patio en el Albaicín o el Sacromonte.",
    proximo: 1,
    contactos: [
      { dias: -7, nota: "Le paso fichas de dos casas: carmen en San Miguel Bajo y casa en el Realejo." },
      { dias: -3, nota: "Visita al carmen del Albaicín. Quiere volver con su pareja.", ref: "GR-2406" },
    ],
  },
  {
    key: "pilar",
    nombre: "Pilar",
    apellidos: "Herrera Blanco",
    tipo: "PROPIETARIO",
    telefono: "666 710 358",
    email: "pilar.herrera@example.com",
    direccion: "C/ Santa Escolástica 9, Granada",
    notas: "Propietaria del ático del Realejo y de dos plazas de garaje. Quiere inquilinos con nómina.",
    proximo: 7,
    contactos: [{ dias: -10, nota: "Acepta rebajar el ático a 950 €/mes si el contrato es de dos años.", ref: "GR-2403" }],
  },
  {
    key: "sergio",
    nombre: "Sergio",
    apellidos: "Domínguez Rey",
    tipo: "COMPRADOR",
    email: "sergio.dominguez@example.com",
    notas: "Sin teléfono. Solo contacto por email. Reservó el piso del Paseo del Salón.",
    proximo: 10,
    contactos: [
      { dias: -14, nota: "Visita al piso del Paseo del Salón. Hace oferta de 265.000 €.", ref: "GR-2412" },
      { dias: -6, nota: "Oferta aceptada. Firma de la reserva con 6.000 €.", ref: "GR-2412" },
    ],
  },
  {
    key: "ana",
    nombre: "Ana",
    apellidos: "Prieto Molina",
    tipo: "INQUILINO",
    telefono: "691 245 870",
    email: "ana.prieto@example.com",
    notas: "Alquiló el local de C/ Navas para su clínica de fisioterapia.",
    contactos: [{ dias: -65, nota: "Firma del contrato del local. Carencia de un mes por obras.", ref: "GR-2419" }],
  },
  {
    key: "jose",
    nombre: "José Luis",
    apellidos: "Castro Marín",
    tipo: "PROPIETARIO",
    telefono: "652 903 117",
    direccion: "C/ Poeta Manuel de Góngora 6, Granada",
    notas: "Vende parcela en el Camino de Purchil. Herencia de tres hermanos: firma él en su nombre.",
    contactos: [{ dias: -35, nota: "Recibida la autorización firmada por los tres hermanos.", ref: "GR-2408" }],
  },
  {
    key: "marta",
    nombre: "Marta",
    apellidos: "Iglesias Soto",
    tipo: "COMPRADOR",
    telefono: "627 466 031",
    email: "marta.iglesias@example.com",
    notas: "Compró la casa de Cervantes hace dos meses. Buena candidata para recomendar la agencia.",
    contactos: [
      { dias: -95, nota: "Primera visita a la casa.", ref: "GR-2416" },
      { dias: -80, nota: "Firma en notaría de la casa de Cervantes.", ref: "GR-2416" },
    ],
  },
  {
    key: "raul",
    nombre: "Raúl",
    apellidos: "Santos Medina",
    tipo: "INQUILINO",
    telefono: "688 132 594",
    notas: "Estudiante de máster en la UGR. Busca piso pequeño cerca de Fuentenueva.",
    proximo: -2,
    contactos: [{ dias: -2, nota: "Le enviamos opciones por debajo de 700 €. Llamar para ver cuál visita." }],
  },
  {
    key: "teresa",
    nombre: "Teresa",
    apellidos: "Vidal Campos",
    tipo: "PROPIETARIO",
    telefono: "614 870 223",
    email: "teresa.vidal@example.com",
    notas: "Propietaria de la oficina de Gran Vía y de los locales de San Juan de Dios y Navas.",
  },
  {
    key: "alberto",
    nombre: "Alberto",
    apellidos: "Ramírez Fuentes",
    tipo: "COMPRADOR",
    telefono: "609 338 745",
    email: "alberto.ramirez@example.com",
    direccion: "C/ Periodista Daniel Saucedo Aranda 3, Granada",
    notas: "Busca garaje cerca de su casa en el Centro. Reservó una plaza y alquila otra.",
    proximo: 3,
    contactos: [{ dias: -4, nota: "Reserva de la plaza de garaje de Recogidas con 1.000 €.", ref: "GR-2413" }],
  },
  {
    key: "nuria",
    nombre: "Nuria",
    apellidos: "Lozano Gil",
    tipo: "PROPIETARIO",
    telefono: "645 520 816",
    email: "nuria.lozano@example.com",
    notas: "Vende carmen en el Albaicín que necesita reforma. Acepta ofertas.",
  },
  {
    key: "miguel",
    nombre: "Miguel Ángel",
    apellidos: "Reyes Paredes",
    tipo: "PROPIETARIO",
    telefono: "697 604 158",
    notas: "Contacto nuevo, llegó por recomendación. Aún sin inmuebles en cartera.",
  },
];

// DNI/NIE ficticios (sin letra: se calcula la de control para que sean válidos).
// Algunos clientes no tienen, a propósito.
const DNIS: Record<string, string> = {
  lucia: "74638215",
  javier: "24587309",
  carmen: "X4829163",
  antonio: "23914576",
  rocio: "75123840",
  manuel: "24190337",
  elena: "74902618",
  francisco: "23675104",
  isabel: "76014592",
  pilar: "24338761",
  sergio: "52917046",
  ana: "75560213",
  jose: "23801459",
  marta: "74215987",
  teresa: "24476120",
  alberto: "76239845",
};

function conLetra(base: string) {
  const numero = Number(base.replace("X", "0").replace("Y", "1").replace("Z", "2"));
  return base + "TRWAGMYFPDXBNJZSQVHLCKE"[numero % 23];
}

// ─── Inmuebles ───────────────────────────────────────────────────────────────
// Cubre los 9 tipos, venta y alquiler, los 4 estados, con y sin propietario,
// en bloque o sueltos, las tres ocupaciones más «Sin datos» (null) y
// adquisiciones potenciales (propietarios que alquilan y podrían vender).

type InmuebleSeed = {
  ref: string;
  direccion: string;
  localidad: string;
  tipo: TipoInmueble;
  operacion: TipoOperacion;
  precio: number;
  m2?: number;
  hab?: number;
  banos?: number;
  estado: EstadoInmueble;
  propietario?: string; // key de cliente
  descripcion?: string;
  creado: number; // días desde hoy
  bloque?: string; // key de bloque
  escalera?: string;
  planta?: number;
  puerta?: string;
  ocupacion: Ocupacion | null;
  potencial?: boolean;
  finAlquiler?: number; // días desde hoy hasta el fin del contrato
};

const INMUEBLES: InmuebleSeed[] = [
  { ref: "GR-2401", direccion: "C/ Recogidas 24", localidad: "Granada (Centro)", bloque: "recogidas", planta: 3, puerta: "B", tipo: "PISO", operacion: "VENTA", precio: 238000, m2: 98, hab: 3, banos: 2, estado: "DISPONIBLE", propietario: "antonio", ocupacion: "VACIO", creado: -40, descripcion: "Piso exterior con ascensor, 3 dormitorios y 2 baños. Cocina amueblada y trastero. A un paso del metro y de Puerta Real." },
  { ref: "GR-2402", direccion: "Carretera de la Sierra 41", localidad: "Granada (Genil)", tipo: "CHALET", operacion: "VENTA", precio: 420000, m2: 260, hab: 5, banos: 3, estado: "DISPONIBLE", propietario: "antonio", ocupacion: "PROPIETARIO", creado: -30, descripcion: "Chalet independiente con piscina y vistas a Sierra Nevada. Parcela de 700 m² y garaje para dos coches." },
  { ref: "GR-2403", direccion: "C/ Santa Escolástica 9, ático", localidad: "Granada (Realejo)", tipo: "ATICO", operacion: "ALQUILER", precio: 980, m2: 80, hab: 2, banos: 1, estado: "DISPONIBLE", propietario: "pilar", ocupacion: "VACIO", creado: -12, descripcion: "Ático con terraza de 30 m² y vistas a la Alhambra. No se admiten mascotas." },
  { ref: "GR-2404", direccion: "C/ San Juan de Dios 38, bajo", localidad: "Granada (Centro)", tipo: "LOCAL", operacion: "VENTA", precio: 185000, m2: 115, banos: 1, estado: "DISPONIBLE", propietario: "teresa", ocupacion: "VACIO", creado: -25, descripcion: "Local diáfano a pie de calle junto a la universidad, con escaparate de 7 metros. Ideal para hostelería o academia." },
  { ref: "GR-2405", direccion: "C/ Estrellas 22", localidad: "Granada (Zaidín)", bloque: "estrellas", escalera: "Izquierda", planta: 4, puerta: "A", tipo: "PISO", operacion: "ALQUILER", precio: 750, m2: 85, hab: 3, banos: 1, estado: "DISPONIBLE", propietario: "manuel", ocupacion: "VACIO", potencial: true, creado: -9, descripcion: "Piso reformado y amueblado junto al Parque Tecnológico. Admite mascotas pequeñas." },
  { ref: "GR-2406", direccion: "Placeta de San Miguel Bajo 5", localidad: "Granada (Albaicín)", tipo: "CASA", operacion: "VENTA", precio: 310000, m2: 170, hab: 4, banos: 2, estado: "DISPONIBLE", propietario: "nuria", ocupacion: "VACIO", creado: -20, descripcion: "Carmen tradicional con jardín y aljibe. Vistas a la Alhambra desde la terraza. Necesita reforma parcial." },
  { ref: "GR-2407", direccion: "Polígono de Almanjáyar, nave 14", localidad: "Granada (Norte)", tipo: "NAVE", operacion: "VENTA", precio: 245000, m2: 520, banos: 1, estado: "DISPONIBLE", propietario: "francisco", ocupacion: null, creado: -15, descripcion: "Nave industrial con altura de 8 m, puerta para camiones y oficina en entreplanta. Acceso directo a la circunvalación." },
  { ref: "GR-2408", direccion: "Camino de Purchil, parcela 22", localidad: "Granada (Vega)", tipo: "TERRENO", operacion: "VENTA", precio: 95000, m2: 4800, estado: "DISPONIBLE", propietario: "jose", ocupacion: null, creado: -35, descripcion: "Parcela en la Vega con pozo propio y acceso por camino asfaltado. Uso agrícola." },
  { ref: "GR-2409", direccion: "C/ Estrellas 22", localidad: "Granada (Zaidín)", bloque: "estrellas", escalera: "Derecha", planta: 3, puerta: "C", tipo: "PISO", operacion: "ALQUILER", precio: 690, m2: 80, hab: 3, banos: 1, estado: "DISPONIBLE", propietario: "manuel", ocupacion: "VACIO", potencial: true, creado: -6, descripcion: "Piso luminoso, exterior. Calefacción y aire acondicionado." },
  { ref: "GR-2410", direccion: "Gran Vía de Colón 22, oficina 3", localidad: "Granada (Centro)", tipo: "OFICINA", operacion: "ALQUILER", precio: 890, m2: 70, banos: 1, estado: "DISPONIBLE", propietario: "teresa", ocupacion: "VACIO", creado: -18, descripcion: "Oficina con dos despachos y sala de reuniones en edificio histórico. Fibra instalada." },
  { ref: "GR-2411", direccion: "C/ Cuesta del Pescado 7", localidad: "Granada (Realejo)", tipo: "CASA", operacion: "VENTA", precio: 265000, m2: 140, hab: 3, banos: 2, estado: "DISPONIBLE", ocupacion: null, creado: -3, descripcion: "Casa de tres plantas con patio interior. Para entrar a vivir." },
  { ref: "GR-2412", direccion: "Paseo del Salón 12", localidad: "Granada (Centro)", bloque: "salon", planta: 1, puerta: "Izq", tipo: "PISO", operacion: "VENTA", precio: 272000, m2: 110, hab: 3, banos: 2, estado: "RESERVADO", ocupacion: "PROPIETARIO", creado: -28, descripcion: "Piso señorial frente al río Genil, en edificio con portero. Reservado con arras pendientes de firma." },
  { ref: "GR-2413", direccion: "C/ Recogidas 24", localidad: "Granada (Centro)", bloque: "recogidas", planta: -1, puerta: "Plaza 7", tipo: "GARAJE", operacion: "VENTA", precio: 24000, m2: 12, estado: "RESERVADO", propietario: "pilar", ocupacion: "VACIO", creado: -16, descripcion: "Plaza de garaje amplia en el sótano del edificio, fácil maniobra." },
  { ref: "GR-2414", direccion: "C/ Estrellas 22", localidad: "Granada (Zaidín)", bloque: "estrellas", escalera: "Derecha", planta: 2, puerta: "D", tipo: "PISO", operacion: "ALQUILER", precio: 650, m2: 65, hab: 2, banos: 1, estado: "RESERVADO", ocupacion: "VACIO", creado: -8, descripcion: "Piso de 2 dormitorios, ideal para estudiantes o parejas." },
  { ref: "GR-2415", direccion: "C/ Pedro Antonio de Alarcón 33, 4ºA", localidad: "Granada (Ronda)", tipo: "PISO", operacion: "VENTA", precio: 205000, m2: 102, hab: 3, banos: 2, estado: "VENDIDO", ocupacion: "PROPIETARIO", creado: -60, descripcion: "Piso con terraza en una de las calles más animadas. Vendido." },
  { ref: "GR-2416", direccion: "Avda. de Cervantes 40", localidad: "Granada (Genil)", tipo: "CASA", operacion: "VENTA", precio: 385000, m2: 220, hab: 4, banos: 3, estado: "VENDIDO", ocupacion: "PROPIETARIO", creado: -120, descripcion: "Casa adosada con jardín en zona residencial. Vendida." },
  { ref: "GR-2417", direccion: "C/ Joaquina Eguaras 3, solar", localidad: "Granada (Beiro)", tipo: "TERRENO", operacion: "VENTA", precio: 120000, m2: 380, estado: "VENDIDO", ocupacion: null, creado: -140, descripcion: "Solar urbano con licencia para edificio de viviendas. Vendido." },
  { ref: "GR-2418", direccion: "C/ Estrellas 22", localidad: "Granada (Zaidín)", bloque: "estrellas", escalera: "Izquierda", planta: 1, puerta: "B", tipo: "PISO", operacion: "ALQUILER", precio: 640, m2: 75, hab: 2, banos: 1, estado: "ALQUILADO", propietario: "manuel", ocupacion: "INQUILINOS", potencial: true, finAlquiler: 52, creado: -50, descripcion: "Piso amueblado. Alquilado." },
  { ref: "GR-2419", direccion: "C/ Navas 17, bajo", localidad: "Granada (Centro)", tipo: "LOCAL", operacion: "ALQUILER", precio: 1100, m2: 90, banos: 1, estado: "ALQUILADO", propietario: "teresa", ocupacion: "INQUILINOS", potencial: true, finAlquiler: 20, creado: -90, descripcion: "Local adaptado para consulta en calle peatonal. Alquilado a clínica de fisioterapia." },
  { ref: "GR-2420", direccion: "Plaza de Gracia 4, plaza 15", localidad: "Granada (Centro)", tipo: "GARAJE", operacion: "ALQUILER", precio: 95, m2: 11, estado: "ALQUILADO", propietario: "pilar", ocupacion: "INQUILINOS", potencial: true, finAlquiler: -5, creado: -70, descripcion: "Plaza de garaje en alquiler mensual. Alquilada." },
];

// Contactos sobre un inmueble registrados desde su ficha (captación incluida).
// `cliente` = persona con la que se habló; también aparece en su historial.
const CONTACTOS_INMUEBLE: { ref: string; cliente?: string; dias: number; nota: string }[] = [
  { ref: "GR-2418", cliente: "manuel", dias: -1, nota: "Manuel cuenta que la inquilina podría dejar el piso en verano. Si queda libre, se plantea venderlo. Volver a llamar en un mes." },
  { ref: "GR-2409", cliente: "manuel", dias: -3, nota: "Pide una valoración para venta si no se alquila este mes. Le preparo un estudio de mercado del Zaidín." },
  { ref: "GR-2405", dias: -15, nota: "Visita técnica: piso vacío y en buen estado. Faltan dos persianas por reparar." },
  { ref: "GR-2419", cliente: "teresa", dias: -20, nota: "Teresa valora vender el local con la inquilina dentro. Rentabilidad actual en torno al 6,8 %." },
  { ref: "GR-2420", cliente: "pilar", dias: -12, nota: "Pilar vendería la plaza si le llega una oferta por encima de 26.000 €." },
  { ref: "GR-2401", cliente: "antonio", dias: -2, nota: "Consulta de bajada de precio: acepta 232.000 € si la compradora confirma esta semana." },
  { ref: "GR-2411", dias: -3, nota: "Cartel de «Se vende» particular en la fachada. Dejamos tarjeta en el buzón para captarla." },
];

// ─── Operaciones cerradas ────────────────────────────────────────────────────
// Una por cada inmueble VENDIDO / ALQUILADO. Mezcla recientes (<30 días,
// cuentan en el panel) y antiguas.

const OPERACIONES: { ref: string; cliente: string; dias: number; precioFinal: number; notas?: string }[] = [
  { ref: "GR-2415", cliente: "elena", dias: -11, precioFinal: 198500, notas: "Arras del 10 %. Firma en notaría de Granada. Hipoteca a 25 años." },
  { ref: "GR-2416", cliente: "marta", dias: -80, precioFinal: 372000, notas: "Pago al contado." },
  { ref: "GR-2417", cliente: "javier", dias: -130, precioFinal: 114000 },
  { ref: "GR-2418", cliente: "isabel", dias: -22, precioFinal: 640, notas: "Contrato de 1 año prorrogable. Fianza de dos mensualidades." },
  { ref: "GR-2419", cliente: "ana", dias: -65, precioFinal: 1050, notas: "Un mes de carencia por obras de adaptación." },
  { ref: "GR-2420", cliente: "alberto", dias: -5, precioFinal: 95 },
];

// ─── Intereses (cliente ↔ inmueble) ──────────────────────────────────────────

const INTERESES: { cliente: string; ref: string; dias: number }[] = [
  { cliente: "lucia", ref: "GR-2401", dias: -9 },
  { cliente: "lucia", ref: "GR-2412", dias: -15 },
  { cliente: "javier", ref: "GR-2404", dias: -12 },
  { cliente: "javier", ref: "GR-2407", dias: -10 },
  { cliente: "carmen", ref: "GR-2405", dias: -2 },
  { cliente: "carmen", ref: "GR-2403", dias: -6 },
  { cliente: "rocio", ref: "GR-2403", dias: -5 },
  { cliente: "david", ref: "GR-2406", dias: -7 },
  { cliente: "david", ref: "GR-2411", dias: -3 },
  { cliente: "sergio", ref: "GR-2412", dias: -14 },
  { cliente: "raul", ref: "GR-2414", dias: -2 },
  { cliente: "raul", ref: "GR-2409", dias: -2 },
  { cliente: "alberto", ref: "GR-2413", dias: -4 },
  { cliente: "elena", ref: "GR-2413", dias: -1 },
  { cliente: "marta", ref: "GR-2402", dias: -20 },
];

// ─── Agenda ──────────────────────────────────────────────────────────────────
// `dias` relativo a hoy; `duracion` en horas. Los de todo el día usan `diasTodoElDia`.

const EVENTOS: {
  titulo: string;
  tipo: "VISITA" | "REUNION" | "LLAMADA" | "FIRMA" | "OTRO";
  dias: number;
  hora?: number;
  duracion?: number;
  diasTodoElDia?: number;
  cliente?: string;
  ref?: string;
  notas?: string;
}[] = [
  { titulo: "Visita GR-2401 con Lucía", tipo: "VISITA", dias: 0, hora: 17.5, cliente: "lucia", ref: "GR-2401", notas: "Le interesa la terraza. Llevar nota simple." },
  { titulo: "Reunión de oficina", tipo: "REUNION", dias: 1, hora: 9, notas: "Repaso de cartera semanal." },
  { titulo: "Llamar a Antonio por la bajada de precio", tipo: "LLAMADA", dias: 1, hora: 12, duracion: 0.5, cliente: "antonio", ref: "GR-2402" },
  { titulo: "Firma arras GR-2407", tipo: "FIRMA", dias: 2, hora: 11, duracion: 1.5, cliente: "francisco", ref: "GR-2407", notas: "Notaría Puerta Real. Confirmar con el comprador." },
  { titulo: "Visita GR-2409 con Javier", tipo: "VISITA", dias: 3, hora: 18, cliente: "javier", ref: "GR-2409" },
  { titulo: "Reportaje de fotos GR-2405", tipo: "OTRO", dias: 4, hora: 10, duracion: 2, cliente: "manuel", ref: "GR-2405", notas: "Fotógrafo confirmado." },
  { titulo: "Jornada de captación en Zaidín", tipo: "OTRO", dias: 7, diasTodoElDia: 2, notas: "Buzoneo y visitas a porterías de los bloques." },
  { titulo: "Visita GR-2418 con Carmen", tipo: "VISITA", dias: 8, hora: 11.5, cliente: "carmen", ref: "GR-2418" },
  { titulo: "Reunión con Elena (tasación)", tipo: "REUNION", dias: 9, hora: 17, cliente: "elena" },
  { titulo: "Formación nuevo CRM", tipo: "REUNION", dias: 14, diasTodoElDia: 1 },
];

/** Medianoche UTC del día a `dias` de hoy: así se guardan los eventos de todo el día. */
function diaUTC(dias: number) {
  const d = new Date(Date.now() + dias * DAY);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function main() {
  await base.oficina.upsert({
    where: { id: OFICINA_DEMO },
    update: {},
    create: { id: OFICINA_DEMO, nombre: "Demo" },
  });
  const director = await base.usuario.findFirst({
    where: { oficinaId: OFICINA_DEMO, rol: "DIRECTOR", activo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!director) {
    throw new Error("La oficina Demo no tiene director activo: créalo con scripts/alta-oficina.ts");
  }
  prisma = clienteDemo(director.id);

  console.log("Borrando datos de la oficina Demo…");
  // Orden por claves foráneas: primero lo que depende de clientes, inmuebles y bloques.
  await prisma.$transaction([
    prisma.evento.deleteMany(),
    prisma.operacion.deleteMany(),
    prisma.interes.deleteMany(),
    prisma.archivo.deleteMany(),
    prisma.contacto.deleteMany(),
    prisma.inmueble.deleteMany(),
    prisma.bloque.deleteMany(),
    prisma.cliente.deleteMany(),
  ]);

  console.log("Creando bloques…");
  const bloqueId = new Map<string, string>();
  for (const { key, ...data } of BLOQUES) {
    const bloque = await prisma.bloque.create({ data });
    bloqueId.set(key, bloque.id);
  }

  console.log("Creando clientes…");
  const clienteId = new Map<string, string>();
  for (const [i, c] of CLIENTES.entries()) {
    const cliente = await prisma.cliente.create({
      data: {
        nombre: c.nombre,
        apellidos: c.apellidos,
        dni: DNIS[c.key] ? conLetra(DNIS[c.key]) : null,
        tipos: [c.tipo],
        asesorId: director.id,
        telefono: c.telefono ?? null,
        email: c.email ?? null,
        direccion: c.direccion ?? null,
        notas: c.notas ?? null,
        fechaProximoContacto: c.proximo === undefined ? null : dia(c.proximo, 12),
        createdAt: dia(-150 + i * 6),
      },
    });
    clienteId.set(c.key, cliente.id);
  }

  console.log("Creando inmuebles…");
  const inmuebleId = new Map<string, string>();
  for (const inm of INMUEBLES) {
    const creado = await prisma.inmueble.create({
      data: {
        referencia: inm.ref,
        direccion: inm.direccion,
        localidad: inm.localidad,
        tipoInmueble: inm.tipo,
        tipoOperacion: inm.operacion,
        precio: inm.precio,
        metrosCuadrados: inm.m2 ?? null,
        habitaciones: inm.hab ?? null,
        banos: inm.banos ?? null,
        descripcion: inm.descripcion ?? null,
        estado: inm.estado,
        propietarioId: inm.propietario ? clienteId.get(inm.propietario)! : null,
        bloqueId: inm.bloque ? bloqueId.get(inm.bloque)! : null,
        escalera: inm.escalera ?? null,
        planta: inm.planta ?? null,
        puerta: inm.puerta ?? null,
        ocupacion: inm.ocupacion,
        adquisicionPotencial: inm.potencial ?? false,
        fechaFinAlquiler: inm.finAlquiler === undefined ? null : diaUTC(inm.finAlquiler),
        asesorId: director.id,
        createdAt: dia(inm.creado),
      },
    });
    inmuebleId.set(inm.ref, creado.id);
  }

  // Como en la app: quien tiene inmuebles asignados lleva la etiqueta «Propietario».
  await prisma.cliente.updateMany({
    where: { inmueblesEnPropiedad: { some: {} }, NOT: { tipos: { has: "PROPIETARIO" } } },
    data: { tipos: { push: "PROPIETARIO" } },
  });

  console.log("Creando contactos…");
  const contactos = [
    ...CLIENTES.flatMap((c, i) =>
      (c.contactos ?? []).map((ct, j) => ({
        clienteId: clienteId.get(c.key)!,
        inmuebleId: ct.ref ? inmuebleId.get(ct.ref)! : null,
        fecha: dia(ct.dias, 9 + j * 2, 15 + i),
        nota: ct.nota,
      }))
    ),
    ...CONTACTOS_INMUEBLE.map((ct, i) => ({
      clienteId: ct.cliente ? clienteId.get(ct.cliente)! : null,
      inmuebleId: inmuebleId.get(ct.ref)!,
      fecha: dia(ct.dias, 17, 5 + i * 7),
      nota: ct.nota,
    })),
  ];
  await prisma.contacto.createMany({ data: contactos });

  // «Último contacto» = latest note on each client / property, so both always match history.
  const [ultimoCliente, ultimoInmueble] = await Promise.all([
    prisma.contacto.groupBy({ by: ["clienteId"], where: { clienteId: { not: null } }, _max: { fecha: true } }),
    prisma.contacto.groupBy({ by: ["inmuebleId"], where: { inmuebleId: { not: null } }, _max: { fecha: true } }),
  ]);
  await prisma.$transaction([
    ...ultimoCliente.map((r) =>
      prisma.cliente.update({ where: { id: r.clienteId! }, data: { fechaUltimoContacto: r._max.fecha } })
    ),
    ...ultimoInmueble.map((r) =>
      prisma.inmueble.update({ where: { id: r.inmuebleId! }, data: { fechaUltimoContacto: r._max.fecha } })
    ),
  ]);

  console.log("Creando operaciones e intereses…");
  for (const op of OPERACIONES) {
    const inm = INMUEBLES.find((i) => i.ref === op.ref)!;
    await prisma.operacion.create({
      data: {
        clienteId: clienteId.get(op.cliente)!,
        inmuebleId: inmuebleId.get(op.ref)!,
        tipoOperacion: inm.operacion,
        fecha: dia(op.dias, 11),
        precioFinal: op.precioFinal,
        notas: op.notas ?? null,
        createdAt: dia(op.dias, 11),
      },
    });
  }

  await prisma.interes.createMany({
    data: INTERESES.map((it) => ({
      clienteId: clienteId.get(it.cliente)!,
      inmuebleId: inmuebleId.get(it.ref)!,
      fecha: dia(it.dias, 13),
    })),
  });

  console.log("Creando agenda…");
  await prisma.evento.createMany({
    data: EVENTOS.map((ev) => {
      const enlaces = {
        clienteId: ev.cliente ? clienteId.get(ev.cliente)! : null,
        inmuebleId: ev.ref ? inmuebleId.get(ev.ref)! : null,
      };
      const base = { titulo: ev.titulo, tipo: ev.tipo, notas: ev.notas ?? null, ...enlaces };
      if (ev.diasTodoElDia) {
        return { ...base, todoElDia: true, inicio: diaUTC(ev.dias), fin: diaUTC(ev.dias + ev.diasTodoElDia) };
      }
      const hora = ev.hora ?? 10;
      const inicio = dia(ev.dias, Math.floor(hora), Math.round((hora % 1) * 60));
      return { ...base, todoElDia: false, inicio, fin: new Date(inicio.getTime() + (ev.duracion ?? 1) * 60 * 60 * 1000) };
    }),
  });

  const [bloques, clientes, inmuebles, contactosTotal, deInmueble, potenciales, intereses, operaciones, eventos] =
    await Promise.all([
      prisma.bloque.count(),
      prisma.cliente.count(),
      prisma.inmueble.count(),
      prisma.contacto.count(),
      prisma.contacto.count({ where: { inmuebleId: { not: null } } }),
      prisma.inmueble.count({ where: { adquisicionPotencial: true } }),
      prisma.interes.count(),
      prisma.operacion.count(),
      prisma.evento.count(),
    ]);
  console.log({
    bloques,
    clientes,
    inmuebles,
    contactos: contactosTotal,
    contactosSobreInmueble: deInmueble,
    potenciales,
    intereses,
    operaciones,
    eventos,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => base.$disconnect());
