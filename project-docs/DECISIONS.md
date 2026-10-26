# Registro de decisiones

> Última revisión: 2026-10-26. Evidencia: historial de Git, código, memoria LaTeX y `app-tfg/RECENT_CHANGES.md`.
> Estado: **Confirmada** (respaldada por código/documentación), **Inferida** (deducida, pendiente de confirmar por el propietario).

| Id | Fecha | Decisión | Justificación / evidencia | Alternativas | Estado |
|---|---|---|---|---|---|
| D-01 | 2026-02 | Next.js App Router como monolito full-stack (UI + API) | Commits iniciales; memoria cap. 6 | Backend separado | Confirmada |
| D-02 | 2026-03 | Auth.js v5 con Credentials, bcrypt y sesión JWT de 30 días, persistida en `user_access_log` para poder revocarla | `auth.ts`; commits de marzo y 2026-04-29 (sesiones revocadas) | Sesiones en BD (adapter) | Confirmada |
| D-03 | 2026-03-24/26 | Sustituir SQL plano con `pg` (`db/init/001_init.sql`) por TypeORM con entidades y migraciones | Rama `chore/migrate-to-typeorm`; commits «Migrations M1» → TypeORM | Prisma, Drizzle (nunca usados) | Confirmada |
| D-04 | 2026-04 | Retirar `assigned_commercial_id` de `clients` y modelar la asignación como historial en `client_commercial_assignments` con una sola asignación activa | Migraciones 009 y 011 | Columna directa | Confirmada (009 no migró datos existentes) |
| D-05 | 2026-04 | Perfiles 1:1 con PK compartida: `clients.id = commercials.id = users.id` | Migraciones 010 y 013; rama `refactor/m2-client-shared-pk` | `linked_user_id` | Confirmada |
| D-06 | 2026-04 | Mapas con Leaflet/OSM, rutas y ETA con OSRM (fallback por distancia), geocodificación con Nominatim; Google Maps solo como enlace de navegación | `lib/commercial/*`, `RECENT_CHANGES.md` | Google Maps SDK (coste/API key) | Confirmada |
| D-07 | 2026-06-16 | Desactivar `proxy.ts` (renombrado a `proxy.hosting.ts`) porque el runtime Edge de Netlify con Next 16 falla (`nextHandler is not a function`); rate limit dentro de cada route handler y protección en layouts y handlers | Commits `fix: disable netlify edge proxy`, `fix: preserve proxy and enforce api rate limits`; README | Otro hosting compatible | Confirmada |
| D-08 | 2026-06 | Demo en Netlify + Neon (URL pooled en runtime, directa para migraciones) + Cloudinary | `netlify.toml`; memoria cap. 9 | Vercel, VPS | Confirmada |
| D-09 | 2026-04-06 | Cloudinary para imágenes (avatares, catálogo, adjuntos, resultados de salón), con borrado de la imagen reemplazada | PR #1; `lib/cloudinary.ts` | Almacenamiento local | Confirmada |
| D-10 | 2026-06 | Separar pedido y reparto: un pedido confirmado puede repartirse en varias entregas con bultos, etiqueta propia y validación por QR | Migración 046; `RECENT_CHANGES.md` | Entrega única por pedido | Confirmada |
| D-11 | 2026-06 | Cobros parciales en tabla propia `order_payments` | Migración 045 | Campos de pago en `orders` (034, quedan como legado) | Confirmada |
| D-12 | 2026-06 | Entrega por comercial o por agencia con cargo configurable desde administración | Migración 047 | — | Confirmada |
| D-13 | 2026-06 | Rangos de cliente Plata/Oro/Platino como segmentos jerárquicos; Plata por defecto; máximo una promoción económica por línea | Migraciones 041/043/048; memoria RF-M6-02 | — | Confirmada |
| D-14 | 2026-06-09 | Eliminar imágenes de subcategorías | Migración 044 | — | Confirmada |
| D-15 | 2026-06-12 | Renombrar timestamps de migraciones 018, 035, 041, 042 | Historial de Git (renames en `ac8b3c07`) | — | Inferida: probablemente para corregir el orden; impacto en BD existentes sin confirmar |
| D-16 | 2026 | M8 (IA, simulación de color, herramientas de cliente final) y Factusol/n8n como trabajo futuro | Memoria `Modules.tex`, `futurework.tex`; ausencia de código | Implementar en el TFG | Confirmada |
| D-17 | 2026 | Service worker propio sin next-pwa; nunca cachear API ni zonas privadas | `public/sw.js`; línea residual de workbox en `.gitignore` | next-pwa/workbox | Confirmada (motivo del abandono de next-pwa: inferido) |
| D-18 | 2026-06-16 | ETA de visitas con duraciones reales OSRM y punto final de jornada con ETA propia | `RECENT_CHANGES.md` | Velocidad media sobre línea recta | Confirmada |
| D-19 | 2026-06-15 | Aplazar una visita de reparto libera el reparto asociado; la ETA al cliente solo se muestra con visita de entrega válida | `RECENT_CHANGES.md`; test `m4-orders-delivery` | — | Confirmada |
| D-20 | 2026-06 | Compilar con `--webpack` y `serverMinification: false` | `package.json`, `next.config.ts`; commit «Prevent server minification» | Turbopack | Inferida: compatibilidad de decoradores TypeORM |
| D-21 | 2026-10-26 | Documentación de continuidad en `project-docs/` + `CLAUDE.md`; `AUDIT_REPORT.md` fuera de Git mientras haya P0 abiertos | Acuerdo con el propietario | — | Confirmada |
| D-23 | 2026-10-26 | El antiguo M8 deja de ser trabajo futuro y entra en el producto, repartido en módulos nuevos numerados por orden de desarrollo: M8 Diagnóstico capilar KINACTIF (integración de KinActif), M9 Integración con Factusol (n8n), M10 Visión (simulación de color y reconocimiento de productos), M11 Asistente inteligente, M12 Cliente final y reservas. Versiones: 1.1 segura, 2.0 con M8–M9, 3.0 con M10–M12 | Instrucción del propietario; plan en `Desktop/TFG/reunion-comercial/reunion-comercial.tex` | Mantener M8 como trabajo futuro | Confirmada (pendiente de validar en la reunión comercial) |
| D-24 | 2026-10-26 | El diagnóstico capilar parte de KinActif (kinactif.netlify.app, del equipo de KIN): app solo de navegador, sin backend ni IA entrenada (heurísticas de píxeles), datos en localStorage, catálogo y reglas en el código, PIN en cliente. Se integrará en el servidor con datos configurables, fotos en la nube, acceso por rol y consentimiento | Revisión del código público el 2026-10-26; sin acceso aún al repositorio ni al autor | Usar KinActif como herramienta independiente | Inferida: pendiente de acordar acceso al código y propiedad |
| D-22 | 2026-10-26 | La memoria del TFG (`docs/`) es de solo lectura para siempre. La documentación del producto se mantiene en `product-docs/`, copia de la memoria con el mismo formato LaTeX y tono no académico | Instrucción expresa del propietario | Editar `docs/` | Confirmada |

## Preguntas abiertas

- Objetivo de la continuación tras la entrega (producción para la distribuidora, portafolio, otra).
- Si la demo de Netlify + Neon sigue activa y con qué usuarios.
- Si las BD existentes se crearon antes del 2026-06-12 (D-15).
- Si `fix/route-planning-persistence` y `fix/react-doctor-audit` se abandonaron a propósito.
