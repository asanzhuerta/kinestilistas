# KinEstilistas App

Aplicación principal del proyecto `KinEstilistas`, construida con `Next.js 16`, `React 19`, `TypeScript` y `PostgreSQL`.

## Qué incluye esta carpeta

- interfaz web por roles (`admin`, `commercial`, `client`);
- API interna basada en `Route Handlers`;
- autenticación con `Auth.js`;
- capa de acceso a datos con `TypeORM`;
- migraciones versionadas para los módulos 1 y 2;
- integración con `Cloudinary`, `Nominatim` y `OSRM`.

## Rutas funcionales más importantes

- `/login`
- `/register`
- `/profile`
- `/admin`
- `/admin/users/*`
- `/admin/clients/*`
- `/commercials`
- `/commercials/clients`
- `/commercials/routes`
- `/commercials/visits`
- `/commercials/settings`
- `/clients`

## Estructura principal

```text
app/
  admin/              páginas del panel administrador
  api/                endpoints internos
  clients/            área cliente
  commercials/        área comercial
  components/         UI reutilizable
  hooks/api/          hooks cliente para consumo de API
lib/
  api/                helpers de servidor y control de acceso
  auth/               helpers de sesión
  commercial/         lógica de planificación de ruta
  contracts/          DTOs y contratos compartidos
  geocoding/          geocodificación de direcciones
  security/           rate limiting y seguridad transversal
  typeorm/            data source, entidades y servicios
migrations/typeorm/   migraciones M1 y M2
```

## Requisitos

- `Node.js 20` o superior
- `npm`
- `Docker Desktop` o equivalente

## Configuración local rápida

### 1. Base de datos

Desde la raiz del repositorio:

```bash
docker compose up -d
```

### 2. Dependencias

```bash
npm install
```

### 3. Variables de entorno

Crear `app-tfg/.env.local` con:

```env
DATABASE_URL=postgres://kin:kin@localhost:5432/kin
AUTH_SECRET=cambia-este-valor
```

Opcionales:

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

### 4. Migraciones

```bash
npm run migration:run
```

### 5. Desarrollo

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run dev:clean
npm run build
npm run build:clean
npm run start
npm run start:clean
npm run lint
npm run typecheck
npm run migration:create
npm run migration:generate
npm run migration:run
npm run migration:revert
npm run migration:show
```

## Notas útiles para desarrollo

- `proxy.ts` aplica protección por rol, compatibilidad mínima de navegador y rate limiting sobre `/api`.
- `auth.ts` concentra el proveedor de credenciales y la trazabilidad de accesos.
- `lib/commercial/daily-route-planning.ts` es la pieza principal para ETA, orden de ruta y margen diario.
- `app/api/profile/upload-image/route.ts` y `lib/cloudinary.ts` gestionan la subida de avatar.
- No hay batería automatizada de tests funcionales; la validación habitual hoy es `lint`, `typecheck` y comprobación manual por rol.
