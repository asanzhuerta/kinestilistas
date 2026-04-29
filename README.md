# KinEstilistas

Aplicación web B2B desarrollada como Trabajo Fin de Grado para centralizar la operativa entre un distribuidor de productos profesionales de peluquería y sus clientes.

El repositorio contiene dos bloques principales:

- `app-tfg/`: aplicación Next.js con frontend, rutas protegidas, API interna y persistencia.
- `docs/`: memoria técnica del proyecto en LaTeX.

## Alcance actual

La versión actual cubre el núcleo operativo de los módulos 1 y 2:

- `M1`: solicitud de alta, registro administrado, login con credenciales, control por roles, gestión de usuarios, estados de cuenta, logs de acceso y gestión de perfil.
- `M2`: gestión de clientes, asignaciones comercial-cliente, geolocalización confirmada, ventanas horarias de visita, visitas comerciales, configuración operativa del comercial, previsualización de ruta diaria y ETA de reparto para cliente.

Los módulos `M3+` aparecen ya reflejados en navegación y requisitos, pero no forman parte del alcance operativo implementado en esta rama.

## Roles disponibles

- `admin`: gestiona usuarios, solicitudes de alta, clientes y asignaciones comerciales.
- `commercial`: consulta clientes asignados, visitas, configuración diaria y previsualización de ruta.
- `client`: consulta su espacio, la estimación de reparto del día y su propio perfil.

## Stack real del proyecto

- `Next.js 16` con `App Router`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Framer Motion`
- `Auth.js / NextAuth 5 beta` con proveedor de credenciales
- `PostgreSQL 16`
- `TypeORM 0.3`
- `Cloudinary` para imágenes de perfil
- `Leaflet` y `react-leaflet` para mapas

## Estructura del repositorio

```text
.
|-- docker-compose.yml
|-- db/
|   `-- init/
|-- app-tfg/
|   |-- app/
|   |-- lib/
|   |-- migrations/typeorm/
|   |-- public/
|   |-- auth.ts
|   |-- proxy.ts
|   `-- package.json
`-- docs/
    `-- sections/
```

## Arquitectura resumida

La aplicación se implementa como un monolito full-stack sobre Next.js:

- las páginas y layouts viven en `app/`,
- los endpoints internos viven en `app/api/`,
- la lógica transversal y de dominio se concentra en `lib/`,
- la persistencia usa TypeORM con migraciones versionadas,
- `proxy.ts` centraliza protección de rutas, compatibilidad mínima de navegador y rate limiting de API.

Servicios externos actualmente integrados:

- `Cloudinary` para subida y reemplazo de imágenes de perfil,
- `Nominatim` para geocodificación de direcciones,
- `OSRM` para trazar rutas sobre mapa.

## Puesta en marcha local

### 1. Clonar el repositorio

```bash
git clone https://github.com/MadaoSurmanito/app-tfg.git
cd <carpeta-del-repositorio-clonado>
```

### 2. Levantar PostgreSQL

Desde la raíz del repositorio:

```bash
docker compose up -d
```

### 3. Instalar dependencias

```bash
cd app-tfg
npm install
```

### 4. Crear `.env.local`

Variables mínimas recomendadas:

```env
DATABASE_URL=postgres://kin:kin@localhost:5432/kin
AUTH_SECRET=cambia-este-valor
```

Variables opcionales según funcionalidad:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_PROFILE_IMAGES_FOLDER=kinestilistas/profile-images

GEOCODING_PROVIDER=nominatim
GEOCODING_COUNTRY_CODE=es
GEOCODING_COUNTRY_NAME=España
GEOCODING_EMAIL=
GEOCODING_USER_AGENT=KinestilistasTFG/1.0

NEXT_PUBLIC_OSRM_BASE_URL=https://router.project-osrm.org
```

Notas:

- sin `Cloudinary` la subida de imagen de perfil no estará operativa;
- la geocodificación funciona por defecto con `Nominatim`, pero las variables anteriores permiten ajustar país, contacto y depuración;
- `OSRM` tiene una URL pública por defecto y solo requiere variable si se quiere cambiar el proveedor.

### 5. Ejecutar migraciones

```bash
npm run migration:run
```

### 6. Arrancar la aplicación

```bash
npm run dev
```

Aplicación disponible en `http://localhost:3000`.

## Scripts útiles

```bash
npm run dev
npm run dev:clean
npm run build
npm run start
npm run lint
npm run typecheck
npm run migration:run
npm run migration:show
```

## Funcionalidades implementadas hoy

### Administración

- revisión de solicitudes de registro,
- alta directa de usuarios,
- consulta de usuarios, cambio de estado y auditoría básica,
- lista de clientes y detalle editable,
- asignación y reasignación de clientes a comerciales.

### Comercial

- panel principal con tarjeta de ruta diaria,
- listado de clientes asignados,
- detalle de cliente con información operativa,
- planificación y seguimiento de visitas,
- configuración de jornada, puntos de salida y duración base de visitas,
- vista de ruta diaria en `/commercials/routes`.

### Cliente

- panel con tarjeta de ETA de reparto del día,
- consulta y edición de perfil,
- confirmación de geolocalización y franja horaria en su ficha asociada.

## Estado actual y límites conocidos

- el panel comercial ya ofrece previsualización de ruta tanto en el dashboard como en `/commercials/routes`;
- el panel de cliente ya muestra la ETA del reparto y el perfil, mientras que otras tarjetas visibles quedan reservadas para módulos futuros;
- la base documental y de base de datos ya está preparada para seguir creciendo hacia catálogo, pedidos, cobros y formaciones.

## Documentación técnica

La memoria del TFG se mantiene en `docs/` y documenta requisitos, diseño, implementación, pruebas y anexos del proyecto.

## Autor

Alejandro Sanz Huerta
