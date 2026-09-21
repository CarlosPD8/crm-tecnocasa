// Datos de demostración (Granada capital). BORRA todos los clientes, inmuebles,
// contactos, intereses, operaciones y registros de archivos antes de insertar.
// Uso: npx prisma db seed
//
// Las fechas son relativas a hoy, así que la demo tiene sentido cualquier día:
// siempre hay contactos vencidos, para hoy y próximos, y operaciones recientes.

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import type {
  EstadoInmueble,
  TipoCliente,
  TipoInmueble,
  TipoOperacion,
} from "../lib/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
});

const DAY = 24 * 60 * 60 * 1000;
/** Fecha a `dias` de hoy (negativo = pasado), a una hora de oficina concreta. */
function dia(dias: number, hora = 10, minuto = 0) {
  const d = new Date(Date.now() + dias * DAY);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

// ─── Clientes ────────────────────────────────────────────────────────────────
// Cubre los 4 tipos, contactos vencidos / hoy / próximos / sin fecha,
// y fichas con datos incompletos (sin email, sin teléfono, sin dirección).

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
  contactos?: { dias: number; nota: string }[];
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
      { dias: -9, nota: "Visita al piso de Recogidas. Le gusta, pero ve la cocina pequeña." },
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
      { dias: -12, nota: "Pide rentabilidad estimada del local de C/ San Juan de Dios." },
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
      { dias: -6, nota: "Descarta el ático del Realejo por no admitir mascotas." },
      { dias: -2, nota: "Interesada en el piso del Zaidín. Visita programada para hoy." },
    ],
  },
  {
    key: "antonio",
    nombre: "Antonio",
    apellidos: "Gallardo Pérez",
    tipo: "VENDEDOR",
    telefono: "699 551 380",
    email: "a.gallardo@example.com",
    direccion: "Camino de Ronda 112, 5ºC, Granada",
    notas: "Vende el piso de Recogidas y el chalet de la Carretera de la Sierra. Se traslada a Málaga en tres meses.",
    proximo: 0,
    contactos: [
      { dias: -30, nota: "Firma de la nota de encargo en exclusiva de los dos inmuebles." },
      { dias: -4, nota: "Le informo de dos visitas al chalet esta semana. Acepta bajar a 400.000 € si hace falta." },
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
    notas: "Tiene tres pisos en alquiler con nosotros (Zaidín, Chana y Beiro). Cobro por transferencia el día 5.",
    proximo: 2,
    contactos: [
      { dias: -40, nota: "Renovación del encargo de gestión de los alquileres." },
      { dias: -8, nota: "Avisa de una avería en el calentador del piso de la Chana." },
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
      { dias: -26, nota: "Firma de arras del piso de Pedro Antonio de Alarcón." },
      { dias: -11, nota: "Firma en notaría. Entrega de llaves." },
    ],
  },
  {
    key: "francisco",
    nombre: "Francisco",
    apellidos: "Romero Aguilar",
    tipo: "VENDEDOR",
    telefono: "640 377 821",
    email: "fromero@example.com",
    notas: "Vende nave en el polígono de Almanjáyar. Precio negociable para venta rápida.",
    proximo: 4,
    contactos: [{ dias: -15, nota: "Reportaje de fotos y medición de la nave." }],
  },
  {
    key: "isabel",
    nombre: "Isabel",
    apellidos: "Cano Fernández",
    tipo: "INQUILINO",
    telefono: "675 093 664",
    email: "isabel.cano@example.com",
    notas: "Alquiló el piso de la Chana. Contrato de un año con prórroga.",
    contactos: [{ dias: -22, nota: "Firma del contrato de alquiler y entrega de fianza." }],
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
      { dias: -3, nota: "Visita al carmen del Albaicín. Quiere volver con su pareja." },
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
    contactos: [{ dias: -10, nota: "Acepta rebajar el ático a 950 €/mes si el contrato es de dos años." }],
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
      { dias: -14, nota: "Visita al piso del Paseo del Salón. Hace oferta de 265.000 €." },
      { dias: -6, nota: "Oferta aceptada. Firma de la reserva con 6.000 €." },
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
    contactos: [{ dias: -65, nota: "Firma del contrato del local. Carencia de un mes por obras." }],
  },
  {
    key: "jose",
    nombre: "José Luis",
    apellidos: "Castro Marín",
    tipo: "VENDEDOR",
    telefono: "652 903 117",
    direccion: "C/ Poeta Manuel de Góngora 6, Granada",
    notas: "Vende parcela en el Camino de Purchil. Herencia de tres hermanos: firma él en su nombre.",
    contactos: [{ dias: -35, nota: "Recibida la autorización firmada por los tres hermanos." }],
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
      { dias: -95, nota: "Primera visita a la casa." },
      { dias: -80, nota: "Firma en notaría de la casa de Cervantes." },
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
    contactos: [{ dias: -4, nota: "Reserva de la plaza de garaje de Recogidas con 1.000 €." }],
  },
  {
    key: "nuria",
    nombre: "Nuria",
    apellidos: "Lozano Gil",
    tipo: "VENDEDOR",
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

// ─── Inmuebles ───────────────────────────────────────────────────────────────
// Cubre los 9 tipos, venta y alquiler, los 4 estados, con y sin propietario.

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
};

const INMUEBLES: InmuebleSeed[] = [
  { ref: "GR-2401", direccion: "C/ Recogidas 24, 3ºB", localidad: "Granada (Centro)", tipo: "PISO", operacion: "VENTA", precio: 238000, m2: 98, hab: 3, banos: 2, estado: "DISPONIBLE", propietario: "antonio", creado: -40, descripcion: "Piso exterior con ascensor, 3 dormitorios y 2 baños. Cocina amueblada y trastero. A un paso del metro y de Puerta Real." },
  { ref: "GR-2402", direccion: "Carretera de la Sierra 41", localidad: "Granada (Genil)", tipo: "CHALET", operacion: "VENTA", precio: 420000, m2: 260, hab: 5, banos: 3, estado: "DISPONIBLE", propietario: "antonio", creado: -30, descripcion: "Chalet independiente con piscina y vistas a Sierra Nevada. Parcela de 700 m² y garaje para dos coches." },
  { ref: "GR-2403", direccion: "C/ Santa Escolástica 9, ático", localidad: "Granada (Realejo)", tipo: "ATICO", operacion: "ALQUILER", precio: 980, m2: 80, hab: 2, banos: 1, estado: "DISPONIBLE", propietario: "pilar", creado: -12, descripcion: "Ático con terraza de 30 m² y vistas a la Alhambra. No se admiten mascotas." },
  { ref: "GR-2404", direccion: "C/ San Juan de Dios 38, bajo", localidad: "Granada (Centro)", tipo: "LOCAL", operacion: "VENTA", precio: 185000, m2: 115, banos: 1, estado: "DISPONIBLE", propietario: "teresa", creado: -25, descripcion: "Local diáfano a pie de calle junto a la universidad, con escaparate de 7 metros. Ideal para hostelería o academia." },
  { ref: "GR-2405", direccion: "C/ Palencia 20, 4ºA", localidad: "Granada (Zaidín)", tipo: "PISO", operacion: "ALQUILER", precio: 750, m2: 85, hab: 3, banos: 1, estado: "DISPONIBLE", propietario: "manuel", creado: -9, descripcion: "Piso reformado y amueblado junto al Parque Tecnológico. Admite mascotas pequeñas." },
  { ref: "GR-2406", direccion: "Placeta de San Miguel Bajo 5", localidad: "Granada (Albaicín)", tipo: "CASA", operacion: "VENTA", precio: 310000, m2: 170, hab: 4, banos: 2, estado: "DISPONIBLE", propietario: "nuria", creado: -20, descripcion: "Carmen tradicional con jardín y aljibe. Vistas a la Alhambra desde la terraza. Necesita reforma parcial." },
  { ref: "GR-2407", direccion: "Polígono de Almanjáyar, nave 14", localidad: "Granada (Norte)", tipo: "NAVE", operacion: "VENTA", precio: 245000, m2: 520, banos: 1, estado: "DISPONIBLE", propietario: "francisco", creado: -15, descripcion: "Nave industrial con altura de 8 m, puerta para camiones y oficina en entreplanta. Acceso directo a la circunvalación." },
  { ref: "GR-2408", direccion: "Camino de Purchil, parcela 22", localidad: "Granada (Vega)", tipo: "TERRENO", operacion: "VENTA", precio: 95000, m2: 4800, estado: "DISPONIBLE", propietario: "jose", creado: -35, descripcion: "Parcela en la Vega con pozo propio y acceso por camino asfaltado. Uso agrícola." },
  { ref: "GR-2409", direccion: "C/ Andrés Segovia 60, 2ºC", localidad: "Granada (Chana)", tipo: "PISO", operacion: "ALQUILER", precio: 690, m2: 80, hab: 3, banos: 1, estado: "DISPONIBLE", propietario: "manuel", creado: -6, descripcion: "Piso luminoso junto a la parada de metro. Calefacción y aire acondicionado." },
  { ref: "GR-2410", direccion: "Gran Vía de Colón 22, oficina 3", localidad: "Granada (Centro)", tipo: "OFICINA", operacion: "ALQUILER", precio: 890, m2: 70, banos: 1, estado: "DISPONIBLE", propietario: "teresa", creado: -18, descripcion: "Oficina con dos despachos y sala de reuniones en edificio histórico. Fibra instalada." },
  { ref: "GR-2411", direccion: "C/ Cuesta del Pescado 7", localidad: "Granada (Realejo)", tipo: "CASA", operacion: "VENTA", precio: 265000, m2: 140, hab: 3, banos: 2, estado: "DISPONIBLE", creado: -3, descripcion: "Casa de tres plantas con patio interior. Para entrar a vivir." },
  { ref: "GR-2412", direccion: "Paseo del Salón 12, 1º", localidad: "Granada (Centro)", tipo: "PISO", operacion: "VENTA", precio: 272000, m2: 110, hab: 3, banos: 2, estado: "RESERVADO", creado: -28, descripcion: "Piso señorial frente al río Genil, en edificio con portero. Reservado con arras pendientes de firma." },
  { ref: "GR-2413", direccion: "C/ Recogidas 50, plaza 7", localidad: "Granada (Centro)", tipo: "GARAJE", operacion: "VENTA", precio: 24000, m2: 12, estado: "RESERVADO", propietario: "pilar", creado: -16, descripcion: "Plaza de garaje amplia en el centro, fácil maniobra." },
  { ref: "GR-2414", direccion: "C/ Periodista Eugenio Selles 8, 2ºD", localidad: "Granada (Ronda)", tipo: "PISO", operacion: "ALQUILER", precio: 650, m2: 65, hab: 2, banos: 1, estado: "RESERVADO", creado: -8, descripcion: "Piso de 2 dormitorios cerca de Fuentenueva, ideal para estudiantes o parejas." },
  { ref: "GR-2415", direccion: "C/ Pedro Antonio de Alarcón 33, 4ºA", localidad: "Granada (Ronda)", tipo: "PISO", operacion: "VENTA", precio: 205000, m2: 102, hab: 3, banos: 2, estado: "VENDIDO", creado: -60, descripcion: "Piso con terraza en una de las calles más animadas. Vendido." },
  { ref: "GR-2416", direccion: "Avda. de Cervantes 40", localidad: "Granada (Genil)", tipo: "CASA", operacion: "VENTA", precio: 385000, m2: 220, hab: 4, banos: 3, estado: "VENDIDO", creado: -120, descripcion: "Casa adosada con jardín en zona residencial. Vendida." },
  { ref: "GR-2417", direccion: "C/ Joaquina Eguaras 3, solar", localidad: "Granada (Beiro)", tipo: "TERRENO", operacion: "VENTA", precio: 120000, m2: 380, estado: "VENDIDO", creado: -140, descripcion: "Solar urbano con licencia para edificio de viviendas. Vendido." },
  { ref: "GR-2418", direccion: "C/ Andrés Segovia 14, 3ºB", localidad: "Granada (Chana)", tipo: "PISO", operacion: "ALQUILER", precio: 640, m2: 75, hab: 2, banos: 1, estado: "ALQUILADO", propietario: "manuel", creado: -50, descripcion: "Piso amueblado junto al metro. Alquilado." },
  { ref: "GR-2419", direccion: "C/ Navas 17, bajo", localidad: "Granada (Centro)", tipo: "LOCAL", operacion: "ALQUILER", precio: 1100, m2: 90, banos: 1, estado: "ALQUILADO", propietario: "teresa", creado: -90, descripcion: "Local adaptado para consulta en calle peatonal. Alquilado a clínica de fisioterapia." },
  { ref: "GR-2420", direccion: "Plaza de Gracia 4, plaza 15", localidad: "Granada (Centro)", tipo: "GARAJE", operacion: "ALQUILER", precio: 95, m2: 11, estado: "ALQUILADO", propietario: "pilar", creado: -70, descripcion: "Plaza de garaje en alquiler mensual. Alquilada." },
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

async function main() {
  console.log("Borrando datos existentes…");
  // Orden por claves foráneas: primero lo que depende de clientes e inmuebles.
  await prisma.$transaction([
    prisma.operacion.deleteMany(),
    prisma.interes.deleteMany(),
    prisma.archivo.deleteMany(),
    prisma.contacto.deleteMany(),
    prisma.inmueble.deleteMany(),
    prisma.cliente.deleteMany(),
  ]);

  console.log("Creando clientes…");
  const clienteId = new Map<string, string>();
  for (const [i, c] of CLIENTES.entries()) {
    const contactos = (c.contactos ?? []).map((ct, j) => ({ fecha: dia(ct.dias, 9 + j * 2, 15 + i), nota: ct.nota }));
    const ultimo = contactos.reduce<Date | null>((max, ct) => (!max || ct.fecha > max ? ct.fecha : max), null);

    const cliente = await prisma.cliente.create({
      data: {
        nombre: c.nombre,
        apellidos: c.apellidos,
        tipoCliente: c.tipo,
        telefono: c.telefono ?? null,
        email: c.email ?? null,
        direccion: c.direccion ?? null,
        notas: c.notas ?? null,
        fechaUltimoContacto: ultimo,
        fechaProximoContacto: c.proximo === undefined ? null : dia(c.proximo, 12),
        createdAt: dia(-150 + i * 6),
        contactos: { create: contactos },
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
        createdAt: dia(inm.creado),
      },
    });
    inmuebleId.set(inm.ref, creado.id);
  }

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

  const [clientes, inmuebles, contactos, intereses, operaciones] = await Promise.all([
    prisma.cliente.count(),
    prisma.inmueble.count(),
    prisma.contacto.count(),
    prisma.interes.count(),
    prisma.operacion.count(),
  ]);
  console.log({ clientes, inmuebles, contactos, intereses, operaciones });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
