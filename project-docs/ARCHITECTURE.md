# Arquitectura real

> Última revisión: 2026-10-26. Describe lo que existe en el código, no un diseño ideal.

## 1. Vista general

```
Navegador (PWA)
  ├─ Server Components (layouts y páginas por rol) ──┐
  └─ Client Components ── requestJson ──► API routes │
                                          (app/api)  │
                                              │      │
                         lib/api/server.ts ◄──┘      │
                  (rate limit + rol + errores)        │
                                              ▼      ▼
                         lib/typeorm/services/** (dominio)
                                              │
                                   TypeORM DataSource (singleton)
                                              │
                                        PostgreSQL 16
Servicios externos: Cloudinary · OSRM · Nominatim · QuickChart · SMTP · Web Push
```

- Monolito Next.js 16 (App Router). Sin Server Actions: todas las escrituras pasan por API routes.
- 87 de ~376 archivos de `app/` son Client Components; los componentes grandes de módulo (pedidos, visitas, coloración, catálogo admin) son cliente y cargan datos por API.
- Las páginas de servidor consultan servicios directamente y pasan props mapeadas.

## 2. Autenticación (`app-tfg/auth.ts`)

- Auth.js v5, proveedor Credentials. Login por email, teléfono o nombre (`find-user-for-login.ts`).
- Orden en `authorize`: rate limit por IP e identificador (en memoria) → búsqueda de usuario → rechazo si `status != active` → `bcrypt.compare` → registro en `user_access_log` (también fallos).
- Sesión JWT de 30 días. El token lleva `sub`, `role`, `name`, `phone`, `image`, `accessSessionId`.
- Revocación: el callback `jwt` comprueba en cada petición que la fila de `user_access_log` no esté revocada (caché en proceso de 2–5 s). Logout y cambio de contraseña propio revocan; `trustHost: true`.
- El rol del token no se recarga desde BD.

## 3. Autorización

| Capa | Mecanismo |
|---|---|
| Páginas | Layouts `app/admin`, `app/commercials`, `app/clients` con `require*Session`; `/profile` y `/shortcuts` comprueban en cada página |
| API | `requireRoleUser(rol)` o `getSessionUser()` en cada handler; ámbito por servicio (p. ej. `canCommercialAccessClient`, `getClientByUserId`, `requireOwnedSalonClient`) |
| Rate limiting | `enforceApiRateLimit(request)` al inicio de cada handler; políticas en `lib/security/rate-limit/` con overrides en tabla `app_rate_limit_policies`; contadores en `Map` de proceso |
| Proxy | `proxy.hosting.ts` desactivado (no hay `proxy.ts`): no hay redirección previa de navegadores ni de roles |

Endpoints públicos: `api/auth/[...nextauth]`, `api/auth/register-request`.

## 4. Base de datos

- 58 entidades registradas en `lib/typeorm/data-source.ts` (lista duplicada en `data-source-cli.ts`). `synchronize: false`, migraciones solo manuales.
- Catálogos de valores con PK `smallint` e ids fijos (`lib/typeorm/constants/catalog-ids.ts`); tablas de negocio con `uuid`; logs con `BIGSERIAL`.
- Dinero: `numeric(12,2)`, operado en céntimos (`lib/utils/money.ts`). Fechas: `timestamptz`; días de negocio en `date`.

Modelo central:

```
users (role_id, status_id)
 ├─1:1─ clients      (id = users.id, RESTRICT)
 └─1:1─ commercials  (id = users.id, CASCADE)
clients ─< client_commercial_assignments >─ commercials   (máx. 1 activa por cliente)
clients ─< commercial_visits >─ commercials
clients ─< orders ─< order_lines (snapshot de precio/referencia)
                 ├─< order_payments
                 └─< order_deliveries ─< order_delivery_lines
order_deliveries >─ commercial_visits (visita de entrega)
product_categories ─< product_lines ─< products / product_subcategories (jerárquicas)
color_charts ─< color_references (pedibles)
clients ─< salon_clients ─< salon_services (ficha técnica, productos, imágenes)
customer_segments (silver/gold/platinum…) ─< client_customer_segments, promotions
system_configurations (clave-valor), external_integrations, integration_operations
```

Estados de pedido: `draft(5) → created(1) → confirmed(2) → delivered(3)`; `cancelled(4)` desde created/confirmed. `delivered` se deriva de que todos los repartos estén entregados.

## 5. Flujos principales

- **Alta**: `/register` → `user_requests` → admin aprueba (transacción: crea `users` + perfil `clients`/`commercials` + asignación obligatoria a comercial si es cliente).
- **Pedido**: borrador (uno por cliente y creador) → envío (recalcula precios y promociones en servidor) → confirmación → preparación de repartos (bultos, etiqueta PDF con QR o «AGENCIA») → vinculación a visita de entrega → validación por QR/manual → cobros parciales hasta saldar.
- **Ruta comercial**: visitas del día ordenadas; ETA con OSRM (timeout 2 s, fallback por distancia); enlace a Google Maps solo para navegar.
- **Promociones**: segmentos jerárquicos por rango; descuento porcentual o por volumen aplicado a líneas; regalo solo informativo.
- **Notificaciones**: `app_notifications` internas; email (si hay SMTP) y Web Push (VAPID) como canales degradables configurables.

## 6. PWA

- `app/manifest.ts` (standalone, iconos 192/512, 5 atajos por rol vía `/shortcuts/*`).
- `public/sw.js` manual, registrado solo en producción (`ServiceWorkerRegister.tsx`): precache del shell, cache-first de estáticos, red con fallback a `/offline` en navegación; nunca cachea `/api` ni zonas privadas. Gestiona `push` y `notificationclick`.

## 7. Integraciones

| Integración | Estado |
|---|---|
| Cloudinary (avatares, catálogo, adjuntos, resultados de salón) | Real |
| Leaflet + OpenStreetMap, OSRM, Nominatim | Real (servicios públicos) |
| QuickChart (imagen QR) | Real (externo) |
| Web Push | Real, sin test |
| SMTP/Nodemailer | Implementado, no configurado en local |
| Google Maps | Solo URL de navegación |
| Factusol vía n8n | Stub de configuración + fila sembrada; sin conexión |
| IA / simulación de color | No existe |

## 8. Despliegue

- Local: Docker Compose (PostgreSQL) + `next dev`.
- Demo: Netlify (`@netlify/plugin-nextjs`, Node 22) + Neon (URL pooled en runtime, directa para migraciones) + Cloudinary. El build no ejecuta migraciones.
- Desarrollo expuesto con VS Code Dev Tunnels / Cloudflare quick tunnels (`allowedDevOrigins` en `next.config.ts`).
- Sin cabeceras de seguridad configuradas (`next.config.ts` no define `headers()`).
