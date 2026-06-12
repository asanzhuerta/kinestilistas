# Kinestilistas

Aplicación web B2B desarrollada como Trabajo Fin de Grado para centralizar la operativa entre una distribuidora de productos profesionales de peluquería, sus comerciales y los salones cliente.

El repositorio agrupa la aplicación principal, la documentación académica, la configuración de despliegue local y los recursos versionados necesarios para revisar el proyecto.

## Qué contiene este repositorio

- `app-tfg/`: aplicación principal en Next.js, con frontend por roles, API interna, autenticación, migraciones y scripts de validación.
- `docs/`: memoria del TFG en LaTeX, figuras, diagramas, bibliografía y secciones redactadas.
- `docker-compose.yml`: servicio local de PostgreSQL usado por la aplicación.

## Estado funcional

La aplicación ya cubre los bloques operativos principales del TFG:

- `M1`: autenticación, registro administrado, roles, usuarios, solicitudes, perfil y trazabilidad básica de accesos.
- `M2`: clientes, asignaciones comercial-cliente, visitas, geolocalización, rutas, configuración diaria y estimación persistida de reparto.
- `M3`: catálogo, categorías, líneas, subcategorías, productos, recursos técnicos, cartas de color, referencias cromáticas y consulta de tonos por filas o cartas.
- `M4`: pedidos, borradores, confirmación, historial, preparación de repartos parciales, etiquetas QR, entregas por comercial o agencia, pagos parciales y seguimiento operativo.
- `M5`: fichas técnicas de salón, servicios, plantillas, productos usados, tonos de coloración e imágenes de resultado.
- `M6`: comunicaciones, promociones, rangos de cliente, descuentos segmentados, avisos y formaciones.
- `M7`: soporte, auditoría, ajustes operativos, tarifa de agencia configurable, rate limiting, operaciones, reportes e integraciones preparadas para automatizaciones futuras.

## Roles de la aplicación

- `admin`: administra usuarios, clientes, asignaciones, catálogo, comunicaciones, auditoría, soporte, operaciones e integraciones.
- `commercial`: consulta clientes asignados, rutas, visitas, pedidos, preparación de repartos, catálogo, coloración, promociones y formaciones.
- `client`: gestiona perfil, pedidos con entrega por comercial o agencia, catálogo, coloración, promociones, formaciones y fichas técnicas de su salón.

## Stack principal

- `Next.js 16` con `App Router`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Auth.js / NextAuth 5 beta`
- `PostgreSQL 16`
- `TypeORM 0.3`
- `Cloudinary`
- `Leaflet` y `OSRM`

## Puesta en marcha local

1. Levantar PostgreSQL desde la raíz:

```bash
docker compose up -d
```

2. Instalar dependencias:

```bash
cd app-tfg
npm install
```

3. Configurar `app-tfg/.env.local`:

```env
DATABASE_URL=postgres://kin:kin@localhost:5432/kin
AUTH_SECRET=cambia-este-valor
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

4. Ejecutar migraciones:

```bash
npm run migration:run
```

5. Arrancar en desarrollo:

```bash
npm run dev
```

La aplicación queda disponible normalmente en `http://localhost:3000`.

## Scripts habituales

```bash
npm run typecheck
npm run lint
npm run build
npm run migration:create -- ./migrations/typeorm/<nombre>
npm run migration:run
npm run m6:closeout
npm run m7:closeout
npm run catalog:upload-product-images -- --dry-run
```

## Criterio de organización

Cada carpeta versionada relevante incluye un `README.md` propio para explicar su contenido y su función dentro de la aplicación.

## Autor

Alejandro Sanz Huerta
