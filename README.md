# KinEstilistas

Aplicación web B2B desarrollada como Trabajo Fin de Grado para centralizar la operativa entre un distribuidor de productos profesionales de peluquería y sus clientes.

El repositorio contiene dos bloques principales:

- `app-tfg/`: aplicación Next.js con frontend, rutas protegidas, API interna y persistencia.
- `docs/`: memoria técnica del proyecto en LaTeX.

## Alcance actual

La versión actual cubre de forma operativa los módulos `M1`, `M2`, `M3` y `M4`, e incorpora ya un bloque funcional operativo de `M5`:

- `M1`: solicitud de alta, registro administrado, login con credenciales, control por roles, gestión de usuarios, estados de cuenta, logs de acceso y gestión de perfil.
- `M2`: gestión de clientes, asignaciones comercial-cliente, geolocalización confirmada, ventanas horarias de visita, visitas comerciales, configuración operativa del comercial, previsualización de ruta diaria y ETA de reparto para cliente.
- `M3`: gestión administrativa del catálogo, consulta pública de productos, navegación jerárquica por categorías y líneas, subcategorías, recursos de apoyo y exploración de cartas de color con sus referencias.
- `M4`: borradores y confirmación de pedidos, historial por rol, reparto integrado en visitas comerciales, validación QR de entrega y seguimiento mínimo de cobro.
- `M5` (bloque operativo actual): fichas de clientes del salon, registro y mantenimiento de servicios, ficha tecnica por servicio, seleccion de tonos de coloracion, galeria visual de resultado final, plantillas reutilizables de servicio, uso de productos, filtrado de historial, sugerencias derivadas del historial tecnico y borradores editables de correo tecnico por servicio.

Quedan fuera por ahora el envio real del correo tecnico a cliente final dentro de `M5`, el modulo `M6` y el grueso de `M8`.

## Roles disponibles

- `admin`: gestiona usuarios, solicitudes de alta, clientes, asignaciones comerciales y el catálogo del módulo `M3`.
- `commercial`: consulta clientes asignados, visitas, configuración diaria, previsualización de ruta, catálogo y coloración.
- `client`: consulta la estimación de reparto del día, su propio perfil, el catálogo público, las cartas de color, sus pedidos y las fichas técnicas internas de su salón.

## Stack real del proyecto

- `Next.js 16` con `App Router`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Framer Motion`
- `Auth.js / NextAuth 5 beta` con proveedor de credenciales
- `PostgreSQL 16`
- `TypeORM 0.3`
- `Cloudinary` para imagenes de perfil, recursos visuales del catalogo y resultados tecnicos del salon
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

- `Cloudinary` para subida, reemplazo y validación de imágenes de perfil y catálogo,
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
npm run m5:technical-email-smoke
npm run m5:service-templates-smoke
npm run m5:salon-visual-smoke
npm run migration:create -- ./migrations/typeorm/<nombre>
npm run migration:run
npm run migration:show
```

## Funcionalidades implementadas hoy

### Administración

- revisión de solicitudes de registro,
- alta directa de usuarios,
- consulta de usuarios, cambio de estado y auditoría básica,
- lista de clientes y detalle editable,
- asignación y reasignación de clientes a comerciales,
- gestión de categorías, líneas, subcategorías y productos del catálogo,
- gestión de recursos de apoyo, cartas de color y referencias cromáticas.

### Comercial

- panel principal con tarjeta de ruta diaria,
- listado de clientes asignados,
- detalle de cliente con información operativa,
- planificación y seguimiento de visitas,
- configuración de jornada, puntos de salida y duración base de visitas,
- vista de ruta diaria en `/commercials/routes`,
- consulta del catálogo de productos con filtros por familia, línea y subcategoría,
- acceso a fichas de producto con información técnica, recursos asociados y coloración relacionada,
- exploración de cartas de color y referencias por línea comercial.

### Cliente

- panel con tarjeta de ETA de reparto del día,
- consulta y edición de perfil,
- confirmación de geolocalización y franja horaria en su ficha asociada,
- consulta del catálogo de productos activos,
- acceso a fichas técnicas y recursos de apoyo,
- exploración de coloración por cartas y tonos,
- gestión del historial de pedidos y su trazabilidad básica,
- alta de clientes del salón y consulta de su historial técnico,
- registro, edicion y eliminacion de servicios con formula, notas tecnicas, productos utilizados y seleccion persistida de tonalidades cuando el producto enlaza referencias de color,
- subida de varias imagenes de resultado final por servicio tecnico para documentar visualmente el acabado conseguido,
- guardado y reutilizacion de plantillas tecnicas de servicio con productos predefinidos,
- filtrado del historial tecnico por texto, tipo y fecha,
- consulta de sugerencias de producto derivadas del historial tecnico,
- generacion de borradores tecnicos editables por servicio, con copia al portapapeles y apertura mediante `mailto`.

## Estado actual y límites conocidos

- el panel comercial ya ofrece previsualización de ruta tanto en el dashboard como en `/commercials/routes`;
- el módulo `M3` está operativo para administración, comerciales y clientes, aunque sigue centrado en consulta y mantenimiento de catálogo, no en transacción comercial;
- el panel de cliente ya muestra la ETA del reparto, el perfil, el catálogo, la coloración, los pedidos y el primer bloque operativo de fichas técnicas del salón;
- `M5` sigue siendo parcial: ya genera plantillas reutilizables, gestiona tonos e imagenes finales y prepara borradores tecnicos editables, pero todavia no incluye envio real ni automatizaciones completas de comunicacion hacia cliente final;
- `M6` y `M8` siguen reservados para iteraciones futuras.

## Documentación técnica

La memoria del TFG se mantiene en `docs/` y documenta requisitos, diseño, implementación, pruebas y anexos del proyecto.

## Autor

Alejandro Sanz Huerta
