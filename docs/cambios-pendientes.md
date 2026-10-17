# Cambios pendientes

Peticiones de la oficina piloto tras la presentación (septiembre 2026) y otros pendientes conocidos. El estado de cada uno está en el resumen.

Estado de cada punto:

- **Listo para hacer**: el diseño está claro; se puede empezar cuando se decida.
- **Pendiente del cliente**: hay preguntas abiertas. **No implementar** hasta tener sus respuestas; al retomarlo, repasar primero las preguntas con el usuario.

---

## Resumen

| # | Cambio | Estado | Esfuerzo | Depende de |
|---|---|---|---|---|
| 1 | Marca «Noticia» | Hecho y desplegado (14/10/2026) | ½ día | — |
| 2 | Registro de actividad | Hecho y desplegado | 2–3 días | — |
| 3 | Subzonas dentro de la oficina | Desplegado (15/10/2026); falta el paso de contraer | 5,5–6,5 días | — |
| 4 | Registrar solo desde la zona o la oficina (ubicación) | Hecho (16/10/2026); falta migrar y desplegar | ~7 días | 2 y 3 |
| 5 | Exportar a PDF apaisado | Hecho y desplegado | 1 día | — |
| — | Importador de Excel | Esperando 3 respuestas del cliente | ~2 días | su Excel real |

Orden seguido: 1 → 2 → 3 → 5 → 4. El registro de actividad fue antes porque es la base de los controles del punto 4.

Total aproximado: 16–18 días. El dosier incluye solo 2 h de mejoras al mes por oficina, así que esto es inversión en el producto o se cobra aparte: lo decide el usuario antes de empezar.

---

## 1. Marca «Noticia»

**Estado (14/10/2026): implementado y desplegado.** El cliente confirmó que un piso solo lleva una marca: «noticia» es un piso que se sabe al 100 % que se vende; «potencial», uno que quizá se venda. Campo `Inmueble.captacion` (null = sin marca, `POTENCIAL`, `NOTICIA`), insignia de estrella para noticia (diana para potencial) y lista «Noticias» en el panel de inicio. Las dos migraciones (`captacion_expand` y `captacion_contract`) están aplicadas en producción: `adquisicionPotencial` ya no existe. El manual de usuario ya lo explica. Pendiente, opcional: `SEED_CONFIRMAR=demo npx prisma db seed` para que la demo tenga noticias (GR-2405 y GR-2419).

**Qué piden.** Igual que «Adquisición potencial», otra marca para los pisos que se sabe al 100 % que se quieren vender.

**Propuesta.** Sustituir el booleano `Inmueble.adquisicionPotencial` por un solo campo «Captación» con tres valores: *Nada / Potencial / Noticia*. Es una escala (potencial = podría venderse; noticia = seguro que se vende), así que un piso no debería tener las dos marcas.

- Migración en dos pasos (expand/contract), como la de oficinas: añadir la columna nueva, copiar `adquisicionPotencial = true` → `POTENCIAL` y, tras desplegar, borrar la columna vieja.
- Afecta a:
  - el formulario del inmueble (sección Situación);
  - el badge de las listas y de la ficha del bloque;
  - el recuento «Potenciales» del bloque, que pasaría a dos recuentos;
  - los filtros de inmuebles y bloques;
  - la exportación a Excel;
  - el seed.
- Extra propuesto: una lista de «Noticias» en el panel de inicio, como prioridad.

**Pregunta abierta para el cliente.**
- ¿Puede un piso ser potencial y noticia a la vez, o una marca sustituye a la otra?

---

## 2. Registro de actividad (solo directores)

**Estado (14/10/2026): implementado y con la migración aplicada; falta desplegar.** Respuestas del cliente: quieren ver también las entradas en la app, solo lo ven los directores y se conserva siempre. Lo hecho:

- Tabla `Actividad` (migración `registro_actividad`): solo se inserta y se lee; la extensión de ámbito y un trigger impiden modificarla. La carga inicial rellena las altas, contactos, citas, archivos y operaciones que ya existían.
- Cada acción de `lib/actions/*` escribe su línea en la misma transacción (`lib/actividad.ts`), con «antes → después» en los cambios. No se registran el orden de las fotos ni los cambios de contraseña propios.
- **Entradas:** cuenta como entrada abrir la app tras 30 min sin usarla (`Usuario.ultimoAcceso`, en `lib/db.ts`). Contar solo los inicios de sesión no serviría: la sesión dura semanas.
- Pantalla `/actividad` (menú «Actividad», solo directores): por día y persona, con resumen, detalle desplegable, filtros (fechas, persona, tipo), buscador y Excel. Sin filtro de fechas, los últimos 7 días.
- `Interes.creadoPorId`.

La migración ya está aplicada en producción (14/10/2026): solo falta el push a Vercel. Pendiente: avisar por escrito a los asesores de que existe el registro (transparencia) y explicarlo en el manual.

**Qué piden.** Una pantalla donde el director vea qué ha hecho cada asesor por día y hora: «Marta hoy ha hecho…, ayer…, anteayer…».

**Estado actual.**
- Clientes, inmuebles, bloques, contactos, citas, archivos y operaciones ya guardan `creadoPorId` y `createdAt`, así que las altas se pueden reconstruir.
- **No** queda rastro de las modificaciones ni de los borrados.
- `Interes` no guarda quién lo creó.

**Propuesta.**

- **Tabla nueva `Actividad`**, con:
  - la oficina, el usuario, la fecha y el tipo de acción;
  - la entidad y su id;
  - un resumen legible, guardado como texto porque la ficha puede borrarse;
  - un detalle con los campos cambiados (antes → después);
  - la ubicación, cuando exista el punto 4.
- **Quién la escribe:** cada server action de `lib/actions/*` al crear, modificar o borrar. Lo más limpio es un helper común, llamado dentro de la misma transacción.
- **Seguridad:** va dentro del ámbito de oficina, con la extensión de `lib/ambito-oficina.ts`, los triggers de `crm_misma_oficina` y las mismas reglas que las demás tablas.
- **Ejemplos:**
  - «Marta dio de alta GR-2431 en C/ Estrellas 22»;
  - «Marta registró una llamada con Lucía Moreno · próximo contacto el jueves»;
  - «Marta cambió el precio de GR-2401: 238.000 € → 232.000 €»;
  - «Marta pasó GR-2414 a Reservado»;
  - «Carlos borró la cita "Visita GR-2409"»;
  - «Marta cerró la venta de GR-2415 por 198.500 €».
- **Pantalla «Actividad»** (solo director, enlace en el menú como Equipo):
  - agrupada por día y, dentro, por asesor;
  - resumen por asesor («12 llamadas · 2 pisos nuevos · 1 visita»);
  - filtros por asesor, fechas y tipo;
  - cada línea enlaza a su ficha;
  - exportable.
- **Carga inicial:** al activarla, rellenar con las altas que ya existen (autor y fecha). Los cambios y borrados anteriores no se pueden recuperar.
- **Añadir `creadoPorId` a `Interes`.**
- **Tamaño estimado:** ~35 MB/año por oficina activa. No supone coste.
- **Aviso legal:** los asesores deben saber que existe el registro, por transparencia. Es menos delicado que la geolocalización.

**Preguntas al cliente (respondidas el 14/10/2026).**
1. ¿Quieren ver también cuándo entra cada asesor en la app, o solo lo que hace dentro? **Sí, también las entradas.**
2. ¿Cada asesor puede ver su propio histórico, o es solo para directores? **Solo directores.**
3. ¿Cuánto tiempo se conserva: siempre, o por ejemplo 12 meses? **Siempre.**

---

## 3. Subzonas dentro de la oficina

**Estado (15/10/2026): implementado; falta aplicar la migración y desplegar.** La estimación pasó de 2–3 días a 5,5–6,5 días: el cliente pidió que cada asesor vea **solo** sus zonas (también los clientes), y eso es una capa de seguridad nueva, no solo organizar. Lo hecho:

- **Datos:** `Zona` (nombre, color de una paleta fija, notas) y `ZonaAsesor` (muchos a muchos). `Bloque.zonaId` e `Inmueble.zonaId` son obligatorios. El de un piso es su zona efectiva: si está en un bloque, el trigger `Inmueble_hereda_zona` le pone la del bloque, y `Bloque_zona_a_pisos` se la cambia cuando cambia la del bloque. Ambos tienen el trigger `crm_misma_oficina`, como las demás FKs.
- **Visibilidad**, en el servidor, en la misma extensión que aísla las oficinas (`lib/zonas.ts` y `lib/ambito-oficina.ts`). El director lo ve todo. El asesor ve:
  - los pisos de sus zonas y los que lleva como asesor responsable;
  - los bloques de sus zonas;
  - sus clientes y los enlazados a un piso que ve (propietario, interesado, comprador o contactado sobre él);
  - los contactos, archivos, interesados y operaciones de todo eso;
  - las citas que creó él y las que no enlazan a nada que no vea.

  Sin zona asignada, no ve pisos ni bloques. Lo que no ve no existe: su URL da «no encontrado», y también se filtran los `include` de cada ficha.
- **Cliente que ya existe y es de otro asesor:** escribiendo su DNI o teléfono exactos en el buscador de clientes aparece marcado «De otro asesor»; al enlazarlo a su piso (propietario, interesado, contacto u operación) pasa a verlo.
- **Solo el director** crea, edita y borra zonas, asigna asesores (en Zonas o en Equipo) y cambia la zona de un bloque o de un piso suelto. Al borrar una zona elige a cuál pasan sus bloques y pisos. Un asesor solo puede meter un piso en un bloque de su misma zona.
- **Pantallas:** menú «Zonas» (tarjetas con asesores, bloques, pisos, noticias y potenciales, «Ver pisos» y «Hoja para la calle»), insignia de color en fichas y listas, columna y filtro «Zona» en inmuebles y bloques, zona en los formularios, columna «Zonas» en Equipo, y aviso «Aún no tienes zona asignada» para un asesor sin zonas.
- **PDF:** el botón PDF de Inmuebles ofrece «Lista» y «**Hoja para la calle**»: los pisos filtrados, agrupados por bloque (calle, escalera, planta y puerta), con hueco para notas. Es la hoja de zona que pedían (filtrando por zona) y sirve para cualquier selección. Máximo 3.000 pisos por PDF. Zona en los PDF y Excel de inmuebles y bloques.
- **Registro de actividad:** altas, cambios y borrados de zonas, y los cambios de zona de bloques, pisos y asesores.
- **Oficinas nuevas** (`scripts/alta-oficina.ts`): empiezan con la zona «General».
- **Rendimiento:** con 2.500 pisos, la lista de clientes de un asesor tarda unos 5 ms.

**Despliegue, en este orden:**
1. `npx prisma migrate deploy` (migración `zonas_expand`). Crea una zona «General» por oficina con todos sus bloques, pisos y asesores, así que nadie pierde acceso.
2. **Push a Vercel justo después.** Hasta entonces, el `next dev` local falla, y la versión desplegada no sabe leer la actividad de zonas.
3. En Demo, `SEED_CONFIRMAR=demo npx prisma db seed`: crea «Zaidín», «Centro» y «Albaicín-Realejo» y reparte los pisos (opcional).
4. Cuando no quede nada sin zona, mover `prisma/pendiente/20261015090100_zonas_contract` a `prisma/migrations/` y `npx prisma migrate deploy` (hace `zonaId` obligatorio en la base de datos).

**Qué piden.** Dividir la zona de la oficina en subzonas, organizar los pisos por subzona y que cada asesor se ocupe de la suya. Sus Excel ya vienen así: un archivo por zona (ejemplo: `docs/+ PAJARITOS - BORRADO.xlsx`).

**Preguntas al cliente (respondidas el 15/10/2026).**
1. ¿Una zona puede tener varios asesores? ¿Un asesor puede llevar varias zonas? **Sí a las dos.**
2. ¿Qué pasa con los pisos que aún no tienen zona? **No hay pisos sin zona.**
3. ¿Qué ve un asesor? **Solo sus zonas**, también en clientes (los de sus pisos). Sin zona asignada, nada hasta que se la asignen. Si es el asesor responsable de un piso de otra zona, lo sigue viendo.
4. ¿Quién gestiona las zonas? **Solo el director**, una a una (sin movimientos en bloque).
5. ¿Clientes repetidos entre zonas? **Enlazarlos por DNI o teléfono.**
6. ¿Hoja de zona en PDF? Filtran los pisos con los que van a trabajar y los imprimen en un solo PDF: la «Hoja para la calle».
7. ¿Mapa? **Más adelante**, con el punto 4: hecho allí (`Zona.forma`, dibujado en Zonas).

---

## 4. Registrar solo desde la zona o la oficina (ubicación)

**Estado (16/10/2026): implementado; falta migrar y desplegar.** El control llega **apagado** en todas las oficinas: desplegar no cambia nada hasta que el director lo enciende.

**Qué piden.** Que un asesor solo pueda meter datos estando en su zona o en la oficina; fuera de esos sitios, no.

**Decisiones del cliente (16/10/2026):**
- **Se bloquea todo lo que guarde datos:** pisos, bloques, clientes, contactos, citas (también arrastrarlas en el calendario y mover el próximo contacto), operaciones, interesados y documentos. Consultar se puede siempre.
- **Basta con estar en cualquiera de sus zonas** para guardar cualquier cosa que vea.
- **Sin excepciones:** no hay permisos temporales.
- **El director** registra desde cualquier sitio.
- **Cuándo se mira:** al abrir un formulario (en los de dentro de una ficha, al primer toque) y otra vez al guardar. Nunca de forma continua, y sin indicador en la cabecera.
- **Histórico:** solo el lugar («En Zaidín», «En la oficina», «Desde la red de la oficina»), nunca coordenadas.
- **Activación:** un interruptor del director, apagado de serie.
- **Ordenador fijo en la oficina:** no lo sabían, así que va incluida la «red de la oficina».

**Lo hecho:**
- **Lugares válidos para un asesor:**
  - el **contorno de sus zonas**, que el director dibuja en un mapa de OpenStreetMap (`Zona.forma`);
  - la **oficina**, un punto con un radio de 150 m, ajustable entre 50 y 1.000;
  - la **red de la oficina**: la IP pública que el director marca con «Esta es la red de la oficina» desde un equipo conectado a ella. Lo que llega por esa conexión cuenta como oficina sin mirar el GPS (sirve para los ordenadores fijos). Se guardan como mucho 5 redes; para IPv6, el prefijo /64.
- **Margen:** el que dé la precisión del móvil, con un máximo de 50 m.
  - con una precisión peor que 150 m: «Señal de ubicación débil, espera unos segundos o acércate a una ventana»;
  - peor que 1 km (ubicación aproximada del móvil): pide activar la ubicación exacta.
- **Lo decide el servidor:**
  - cada acción que guarda empieza por `getContextoEscritura(ub)` (`lib/db.ts`);
  - con el control encendido, el `ctx.db` de un asesor es de solo lectura, así que una escritura que olvide comprobarlo falla;
  - un test (`tests/estructura.test.ts`) obliga a que cada acción nueva sea de lectura o compruebe la ubicación.
- **En el navegador:**
  - los formularios muestran «Estás fuera de tu zona y de la oficina. Podrás registrarlo cuando vuelvas» antes de escribir, y desactivan Guardar;
  - si el permiso está denegado, se explica cómo darlo en iPhone, Android u ordenador;
  - en el calendario, la cita arrastrada vuelve a su sitio.
- **Pantalla Zonas:**
  - un mapa con las zonas y la oficina (el asesor ve las suyas);
  - **para el director**, la tarjeta «Control de ubicación»:
    - marcar la oficina en el mapa;
    - las redes;
    - los avisos de zonas sin contorno y de asesores sin zona (esos solo pueden registrar desde la oficina);
    - «Comprobar dónde estoy», para revisar los contornos paseando;
    - el interruptor, que exige tener la oficina marcada y confirmar «He informado por escrito a los asesores»;
  - en cada zona, «Dibujar» o «Contorno».
- **Registro de actividad:**
  - cada línea guardada con el control encendido lleva su lugar, que el director ve en Actividad, en su Excel y en la búsqueda;
  - quedan registrados los cambios de contornos, de oficina, de redes y del interruptor.
- **Datos de demo:** la oficina en Puerta Real y contornos aproximados de Zaidín, Centro y Albaicín-Realejo, con el control apagado.

**Despliegue:**
1. `npx.cmd prisma migrate deploy` (migración `20261016090000_ubicacion`). Solo añade columnas y es compatible con la versión desplegada.
2. Push a Vercel.
3. En Demo: el seed pone la oficina y los contornos (opcional). Si no, se marcan a mano en Zonas.

**Para activarlo en una oficina:**
1. Marcar la oficina en el mapa.
2. Dibujar el contorno de cada zona.
3. Marcar la red de la oficina desde su Wi-Fi o su cable.
4. Entregar a los asesores el aviso por escrito (modelo en `docs/aviso-ubicacion.md`).
5. Encender el interruptor.

Para volver atrás basta con apagarlo: se aplica en el siguiente guardado.

**Limitaciones que el cliente debe conocer:**
- **No es infalible:** el GPS simulado no se detecta. El histórico de lugares ayuda a ver patrones raros.
- **iPhone:** necesita la «Ubicación exacta» activada para Safari, que a veces vuelve a pedir el permiso. En Android 12 o posterior, la ubicación aproximada se bloquea con su mensaje.
- **Red de la oficina:**
  - si el operador cambia la IP, el director la vuelve a marcar;
  - si el operador usa CGNAT, la IP pública se comparte con otros clientes suyos, que también contarían como oficina: conviene una IP fija;
  - con VPN o iCloud Private Relay, ese móvil usa el GPS;
  - la IP solo es fiable mientras la app se sirva directamente desde Vercel, sin un proxy delante.
- **Aviso legal (RGPD y art. 90 de la LOPDGDD):**
  - hay que informar a los asesores **por escrito y antes** de activarlo;
  - hace falta un contrato de encargo de tratamiento entre la oficina y Picaco;
  - si los asesores son autónomos, que lo consulten con su asesoría.

**Preguntas al cliente (respondidas el 16/10/2026).**
1. ¿Se bloquea todo o solo algunas acciones? **Todo lo que guarde datos.**
2. ¿Tienen ordenador fijo? **No lo saben**: va incluida la red de la oficina.
3. ¿Permisos temporales? **No.**
4. ¿Una zona o varias por asesor? **Varias** (punto 3); basta con estar en cualquiera.
5. ¿Asesores empleados o autónomos? **Sin responder**; afecta solo al aviso legal.

**Esfuerzo:** unos 7 días. El documento decía unos 4,5. La diferencia sale de comprobar al abrir y al primer toque, el aviso en cada formulario, el flujo de activación y los tests.

---

## 5. Exportar a PDF apaisado

**Estado (14/10/2026): implementado, falta desplegar** (no lleva migración). Lo hecho:

- Botón **PDF** en Inmuebles, Clientes y Bloques, con la lista tal como esté filtrada, y **Hoja en PDF** en la ficha de cada bloque, piso por piso con una columna de notas para escribir a mano.
- Lo puede sacar **cualquier asesor** (el Excel sigue siendo solo del director). Se abre en una pestaña nueva y desde ahí se imprime o se guarda.
- Columnas: inmuebles (referencia, dirección, bloque, captación, estado, propietario, teléfono, último y próximo contacto); clientes (nombre, etiquetas, teléfono, email, dirección, asesor, último y próximo contacto); bloques (recuentos de ocupación, noticias y potenciales); hoja del bloque (piso, ocupación, captación, estado, propietario, teléfono, último y próximo contacto, notas).
- Cabecera con la oficina, la fecha y los filtros; totales al final; «Página X de Y» en el pie. Máximo 3.000 filas.
- Con el punto 3 llegó la **Hoja para la calle** de cualquier selección de pisos (por ejemplo, una zona entera), agrupada por bloque.
- Hecho con `pdf-lib` en `lib/pdf/` (JavaScript puro, sin navegador ni archivos de fuentes). Las fuentes estándar no tienen emojis: salen como «?».

**Qué piden.** Además del Excel, exportar a PDF en horizontal «como una factura».

**Propuesta.**
- **Generación:** en el servidor, en un route handler como los de `app/(dashboard)/*/exportar/route.ts`, con una librería de PDF ligera. Nada de navegador headless, que es demasiado pesado para Vercel.
- **Contenido:**
  - cabecera con la oficina, la fecha y los filtros aplicados;
  - tabla con 8–10 columnas;
  - número de página en el pie;
  - totales al final (número de pisos, suma de precios…).
- **Límite:** unas 1.000–2.000 filas por PDF.
- **Coste:** ninguno (1–2 s de servidor por PDF).

**Preguntas al cliente (respondidas el 14/10/2026).**
1. ¿Qué quieren imprimir: las listas generales, o **la hoja de un bloque o de una zona** para llevar en papel a la calle, piso por piso? **Las dos.** (La hoja de una zona llegará con el punto 3.)
2. ¿Qué columnas? **Captación, propietario, teléfono, calle, bloque, etiquetas del cliente, último y próximo contacto; en la hoja del bloque, la propuesta completa.**
3. ¿Puede exportar cualquier asesor, o solo el director, como el Excel? **Cualquier asesor.**

---

## Costes de servidor de estos cambios

La oficina piloto ha dicho que **no va a subir fotos**, así que el almacenamiento prácticamente no crece.

| Cambio | Coste extra |
|---|---|
| Noticia, actividad, zonas, PDF, comprobación de ubicación, red de la oficina | 0 € |
| Mapa para dibujar las zonas | 0 € con OpenStreetMap; plan B MapTiler Flex, 30 $/mes |

- **OpenStreetMap:** permite una app comercial pequeña si se cumplen sus condiciones:
  - atribución «© OpenStreetMap contributors» visible;
  - User-Agent y Referer identificando la app;
  - no descargar zonas por adelantado.

  No da garantías y puede cortar el acceso sin aviso. Hay que dejar el proveedor configurable. El plan gratuito de MapTiler **no** permite uso comercial.
- **Situar direcciones en el mapa:** no hace falta, porque las zonas se dibujan y la oficina se marca a mano. Si algún día se usa Nominatim, el límite es 1 petición/s, con caché y sin cargas masivas.

**Costes de servidor totales, sin fotos:**

| Oficinas | Coste al mes |
|---|---|
| 1–9 | ≈ 41 € |
| 10–14 | ≈ 46 € |
| 15–20 | ≈ 55 € |

Unos 26 € más si hiciera falta el mapa de pago.

---

## Otros pendientes conocidos

**Antes del piloto**
- **Importador de Excel.** El dosier promete «lo que tengáis en Excel lo pasamos nosotros», y las oficinas llevan la captación en Excel. Diseñarlo con su archivo real delante: crear clientes, bloques e inmuebles relacionados, con un informe de filas dudosas.
  - **Análisis del 15/10/2026** con `docs/+ PAJARITOS - BORRADO.xlsx`. Son 1.766 pisos que la oficina tuvo que quitar del CRM de Tecnocasa por saturación. Los datos son reales y el formato es el de exportación de Tecnocasa. Hay un archivo por zona y llegarán más.
  - **Correspondencias:**
    - `IN - dirección [planta puerta] - propietario` → piso, planta, puerta y propietario;
    - la misma dirección repetida → bloque (106 direcciones);
    - Noticia y «Potencial adquisición» → captación;
    - «Ocupado por» → ocupación;
    - «Comentario 1–4» con sus fechas (N–Q) → contactos;
    - «Resumen zona» → notas;
    - el archivo → la zona.
  - **Limpieza necesaria:**
    - unificar direcciones («C. Cisne 22» y «Calle Cisne 22»);
    - interpretar planta y puerta («02 F», «2ºa», «04 DR», «ns»…);
    - tratar como «sin propietario» los marcadores de propietario desconocido («Atico Tortola 25» ×322, «Anonimo», «Propietario 2 F Gaviota 2», vacío);
    - unificar por teléfono los propietarios con varios pisos;
    - aceptar celdas con dos teléfonos.
  - **Diseño propuesto (~2 días):**
    - un script con ensayo previo e informe, y después la importación real;
    - repetible sin duplicar, reconociendo los pisos por dirección, planta y puerta;
    - tipo y operación por defecto, y referencia automática;
    - precio opcional, para no mostrar «0 €»;
    - más adelante, una pantalla de importación para el director (3–4 días).
  - **Preguntas al cliente (pendientes):**
    1. ¿Qué es «Encargo» (7 pisos)?
    2. ¿Puede Tecnocasa exportar más columnas (precio, tipo, venta o alquiler, DNI del propietario)?
    3. ¿Los pisos importados llevan asesor responsable, o basta con la zona?
- **Planes de pago.** Pasar Supabase y Vercel a Pro antes de meter datos reales. El plan gratuito de Vercel no permite uso comercial, y el de Supabase pausa el proyecto y no hace copias.
- **Copia de seguridad de los documentos.** Las copias de Supabase no incluyen Storage. Con fotos descartadas es poco volumen; ver la nota en la memoria sobre R2.

**Mejoras de uso detectadas en la revisión** (sin pedir por el cliente)
- **Botón «Registrar llamada»** en la cabecera de las fichas, y abrir la pestaña Contactos al venir de «Por contactar».
- **Móvil:**
  - navegación inferior, porque el menú superior esconde Calendario y Equipo;
  - teléfonos que llamen al tocarlos, y enlace a WhatsApp.
- **Textos:**
  - «inmuebles publicados» → «disponibles en cartera»;
  - «Ocupación: Propietario» → «Vive el propietario»;
  - leyenda o tooltip para el icono de adquisición potencial;
  - en el panel «Inmuebles disponibles», mostrar la dirección en vez de la localidad.
- **Calendario:** «Contactos hechos» desactivado por defecto.
- **Mi cuenta:** que cada usuario pueda cambiar su propio nombre. Hoy solo el director, desde Equipo.
- **Oficina nueva:** guía de primeros pasos cuando está vacía.
- **Aviso de hidratación** en `components/ui/pagination.tsx` (`data-slot`), solo en desarrollo.

**Dosier comercial**
- **«Copias de seguridad diarias»** → «de los datos», mientras no haya copia de los documentos.
- **Precio de 5 oficinas o más:** poner «134 €» en la tabla en vez de «−10 %».
- **Soporte:** «24 horas laborables».
- **Fotos:** valorar quitar la línea de «25 GB de fotos» con esta oficina.

---

## Recordatorios técnicos al implementar

- **Migraciones:** si un cambio añade una carpeta en `prisma/migrations`, el orden es **primero** `npx prisma migrate deploy` y **después** el push a Vercel. Si no, producción falla (ya pasó con `fechaProximoContacto`).
- **La base de datos es la de producción,** compartida por el desarrollo local. Probar lo arriesgado con el Postgres de Docker (`TEST_DATABASE_URL`, ver `.env.example`).
- **Acceso a datos:** todo pasa por `getContexto()` / `ctx.db` (`lib/db.ts`). Los permisos se comprueban en el servidor, nunca solo ocultando botones.
- **Modelos nuevos con `oficinaId`:** hay que añadirlos a la extensión de ámbito, a los triggers y a los tests de `tests/aislamiento.test.ts`.
- **Datos de demo:** `SEED_CONFIRMAR=demo npx prisma db seed` rehace la oficina Demo. Actualizarlo con cada campo nuevo.
- **Manual de usuario:** está publicado como artefacto («Manual de Picaco»). Actualizarlo cuando salgan estas funciones.
