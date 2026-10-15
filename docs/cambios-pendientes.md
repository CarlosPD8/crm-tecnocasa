# Cambios pendientes

Peticiones de la oficina piloto tras la presentación (septiembre 2026) y otros pendientes conocidos. Es el punto de partida para las próximas sesiones de trabajo: nada de esto está implementado.

Estado de cada punto:

- **Listo para hacer**: el diseño está claro; se puede empezar cuando se decida.
- **Pendiente del cliente**: hay preguntas abiertas. **No implementar** hasta tener sus respuestas; al retomarlo, repasar primero las preguntas con el usuario.

---

## Resumen

| # | Cambio | Estado | Esfuerzo | Depende de |
|---|---|---|---|---|
| 1 | Marca «Noticia» | Hecho y desplegado (14/10/2026) | ½ día | — |
| 2 | Registro de actividad | Hecho y migrado; falta desplegar | 2–3 días | — |
| 3 | Subzonas dentro de la oficina | Pendiente del cliente | 2–3 días | — |
| 4 | Registrar solo desde la zona o la oficina (ubicación) | Pendiente del cliente | ~3,5 días | 2 y 3 |
| 5 | Exportar a PDF apaisado | Hecho; falta desplegar | 1 día | — |
| — | Importador de Excel | Necesario antes del piloto | por estimar | su Excel real |

Orden propuesto: 1 → 2 → 3 → 5 → 4. El registro de actividad va antes porque es la base de los controles del punto 4.

Total aproximado: 10–12 días. El dosier incluye solo 2 h de mejoras al mes por oficina, así que esto es inversión en el producto o se cobra aparte: lo decide el usuario antes de empezar.

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

**Qué piden.** Dividir la zona de la oficina en subzonas, organizar los pisos por subzona y que cada asesor se ocupe de la suya.

**Propuesta.**

- **Modelo `Zona`** por oficina:
  - nombre;
  - forma dibujada en un mapa, necesaria para el punto 4;
  - asesores asignados.
- **Asignación:** la zona va en el **bloque**, porque un portal está en una sola zona, y los pisos la heredan. Los pisos sueltos, sin bloque, llevan su zona directamente. La asignación es manual; asignar solo por calle necesitaría un callejero y queda para más adelante.
- **Clientes:** sin zona, compartidos por toda la oficina como ahora. Un comprador busca en cualquier sitio y un propietario puede tener pisos en varias zonas.
- **Filtros por zona** en inmuebles y bloques, y un panel de inicio que por defecto muestre «mi zona».
- **Pantalla de gestión de zonas** para el director (crear, dibujar, asignar asesores).
- **Seguridad:** las FKs nuevas (`zonaId`) necesitan su trigger `crm_misma_oficina` y tests de aislamiento, como el resto.

**Preguntas abiertas para el cliente.**
1. ¿Una zona puede tener varios asesores? ¿Un asesor puede llevar varias zonas?
2. ¿Qué pasa con los pisos que aún no tienen zona asignada?

---

## 4. Registrar solo desde la zona o la oficina (ubicación)

**Qué piden.** Que un asesor solo pueda meter datos si está físicamente en su zona. Para que no bloquee el trabajo de oficina, el usuario propuso permitir **su zona + la oficina**: fuera de esos dos sitios, no puede registrar.

**Diseño propuesto.**

- **Lugares permitidos para cada asesor:**
  - su zona, el polígono del punto 3;
  - la oficina, su dirección con un radio de ~150–200 m.
- **El director:** puede registrar desde cualquier sitio.
- **Al guardar:** el navegador envía la posición (Geolocation API, con permiso la primera vez) y el **servidor** comprueba si cae dentro. Si está fuera, sale un mensaje claro («Estás fuera de tu zona y de la oficina. Podrás registrarlo cuando vuelvas»). Consultar datos sigue permitido siempre.
- **Indicador en la cabecera:** *En tu zona / En la oficina / Fuera*.
- **Red de la oficina:** para los ordenadores fijos, cuya ubicación por navegador puede ser muy imprecisa, el director pulsa una vez «Esta es la red de la oficina» y se guarda la IP pública. Lo que llegue desde esa IP cuenta como «en la oficina», y es más difícil de falsificar que el GPS. Si la IP cambia, el director vuelve a pulsarlo.
- **Señal débil:** margen según la precisión que dé el móvil. Si es muy mala, «Señal de ubicación débil, espera unos segundos o acércate a una ventana».
- **Permisos temporales:** el director puede dar uno («Marta puede registrar desde cualquier sitio hoy»).
- **Histórico:** cada registro guarda su ubicación en el registro de actividad (punto 2), y el director puede verla.

**Limitaciones que el cliente debe conocer.**
- **No es infalible:** con la ubicación simulada en el móvil se puede engañar. El servidor no puede verificar el GPS, pero el histórico con las ubicaciones permite detectar patrones raros.
- **Aviso legal (RGPD y art. 90 de la LOPDGDD):**
  - hay que informar a los asesores **por escrito y antes** de activarlo;
  - la ubicación se toma solo al guardar, nunca de forma continua;
  - hace falta un contrato de encargo de tratamiento entre la oficina y Picaco.

  Si los asesores son autónomos, que lo consulten con su asesoría laboral.

**Alternativas ya comentadas**, por si prefieren algo menos rígido:
- **A. Registrar sin bloquear:** guardar la ubicación y marcar «registrado fuera de zona» para el director.
- **B. Bloquear solo lo de calle:** exigir estar a menos de 100–150 m del bloque solo para visitas, pisos nuevos y noticias.

**Esfuerzo aproximado.** Las zonas con su dibujo en el mapa se cuentan en el punto 3.

| Parte | Días |
|---|---|
| Ubicación y red de la oficina | 1 |
| Comprobación al guardar en todas las acciones, más el indicador y los mensajes | 2 |
| Permisos temporales del director | 0,5 |

**Preguntas abiertas para el cliente.**
1. ¿Se bloquea **todo** lo que sea registrar o modificar, o solo algunas acciones?
2. ¿Tienen ordenador fijo en la oficina? ¿Va por cable o por Wi-Fi?
3. ¿Quieren permisos temporales para trabajar fuera de zona?
4. ¿Cada asesor tiene una sola zona, o alguno puede llevar varias?
5. ¿Los asesores son empleados o autónomos? ¿Lo han consultado con su asesoría?

---

## 5. Exportar a PDF apaisado

**Estado (14/10/2026): implementado, falta desplegar** (no lleva migración). Lo hecho:

- Botón **PDF** en Inmuebles, Clientes y Bloques, con la lista tal como esté filtrada, y **Hoja en PDF** en la ficha de cada bloque, piso por piso con una columna de notas para escribir a mano.
- Lo puede sacar **cualquier asesor** (el Excel sigue siendo solo del director). Se abre en una pestaña nueva y desde ahí se imprime o se guarda.
- Columnas: inmuebles (referencia, dirección, bloque, captación, estado, propietario, teléfono, último y próximo contacto); clientes (nombre, etiquetas, teléfono, email, dirección, asesor, último y próximo contacto); bloques (recuentos de ocupación, noticias y potenciales); hoja del bloque (piso, ocupación, captación, estado, propietario, teléfono, último y próximo contacto, notas).
- Cabecera con la oficina, la fecha y los filtros; totales al final; «Página X de Y» en el pie. Máximo 2.000 filas.
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
