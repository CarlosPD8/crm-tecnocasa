# CRM Inmobiliario Básico

CRM interno para gestión de clientes, inmuebles y operaciones de una inmobiliaria. Centraliza en un único lugar la información que hoy está repartida entre hojas de cálculo y documentos sueltos.

## Stack técnico

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Base de datos:** PostgreSQL vía [Supabase](https://supabase.com)
- **ORM:** Prisma
- **Almacenamiento de archivos:** Supabase Storage (fotos de inmuebles y documentos)
- **Autenticación:** Supabase Auth
- **UI:** Tailwind CSS + shadcn/ui
- **Despliegue:** Vercel

## Funcionalidades

- **Clientes:** ficha completa, tipo de cliente (comprador/vendedor/inquilino/propietario), historial de contactos, notas.
- **Inmuebles:** ficha completa, fotos, documentos, estado (disponible/reservado/vendido/alquilado), propietario asociado.
- **Relación clientes-inmuebles:** interesados, operaciones cerradas, historial.
- **Seguimiento:** listado de clientes pendientes de contactar, próximos contactos.
- **Panel principal:** accesos rápidos y widgets con la información clave del día a día.
- **Búsqueda y filtros:** por cliente, por inmueble, por estado, por tipo de operación.

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (proyecto creado, con URL y claves API a mano)
- Cuenta en [Vercel](https://vercel.com) (para el despliegue)

## Puesta en marcha

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone <url-del-repositorio>
   cd <nombre-del-proyecto>
   npm install
   ```

2. Crear el archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

   Rellenar con los datos del proyecto de Supabase:

   ```env
   DATABASE_URL=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

3. Aplicar el schema de la base de datos:

   ```bash
   npx prisma migrate dev
   ```

4. Levantar el entorno de desarrollo:

   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`.

## Despliegue

El proyecto está pensado para desplegarse en Vercel:

1. Conectar el repositorio en el dashboard de Vercel.
2. Configurar las mismas variables de entorno del paso anterior en Vercel (Settings → Environment Variables).
3. Desplegar. Cada push a la rama principal genera un nuevo despliegue automático.

## Estructura del proyecto

```
├── app/                # Rutas y páginas (App Router)
├── components/          # Componentes reutilizables (UI)
├── lib/                 # Utilidades, cliente de Supabase, helpers
├── prisma/               # Schema y migraciones de la base de datos
└── public/               # Recursos estáticos
```

## Fuera de alcance (v1)

Esta primera versión no incluye: inteligencia artificial, WhatsApp integrado, llamadas automáticas, automatizaciones comerciales, chatbots, firma digital, portal externo para clientes, integraciones con portales inmobiliarios ni campañas de marketing automáticas. Estas funciones podrán estudiarse en fases futuras.

## Licencia

Proyecto de uso privado / interno.
