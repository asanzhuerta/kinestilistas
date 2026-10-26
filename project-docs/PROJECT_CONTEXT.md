# Contexto del proyecto

> Última revisión: 2026-10-26 (auditoría inicial de continuidad). Fuente de verdad: el código del repositorio.

## 1. Descripción

**Kinestilistas** es el software del TFG de Ingeniería Informática (UCA) «Aplicación web progresiva para la gestión comercial en la distribución de productos capilares». Centraliza la operativa de una distribuidora de productos profesionales de peluquería (marca KIN COSMETICS) con sus comerciales y los salones cliente, que antes trabajaban con Excel, Access, Google Sheets, Factusol y papel.

- Memoria y código entregados el **2026-06-24**; el código entregado corresponde al tag `v1.0.0` (2026-06-19). Los commits posteriores en `master` solo tocan documentación.
- Defensa preparada para julio de 2026 (material en `presentación/`, ignorado por Git).
- Repositorio remoto: GitHub `asanzhuerta/kinestilistas` (declarado público en el README).

## 2. Roles

| Rol | Alcance |
|---|---|
| `admin` | Usuarios, solicitudes, clientes, asignaciones, catálogo, comunicaciones, pedidos, ajustes, auditoría |
| `commercial` | Clientes asignados, visitas, rutas, pedidos, preparación de repartos, cobros, catálogo, promociones, formaciones |
| `client` (salón) | Perfil, pedidos, catálogo, coloración, promociones, formaciones, fichas técnicas de sus clientes finales |

## 3. Alcance funcional y estado resumido

| Módulo | Estado |
|---|---|
| M1 Usuarios, autenticación, roles, solicitudes, auditoría | Implementado |
| M2 Comerciales, clientes, asignaciones, visitas, rutas, geolocalización | Implementado |
| M3 Catálogo, productos, coloración | Implementado (sin stock) |
| M4 Pedidos, repartos, QR, agencia, cobros parciales | Implementado |
| M5 Fichas técnicas de salón, servicios, plantillas | Implementado |
| M6 Promociones, segmentos/rangos, notificaciones, formaciones | Implementado |
| M7 Administración e integraciones | Parcial (UI de operaciones e integraciones huérfana) |
| M8 Diagnóstico capilar KINACTIF (integración de KinActif) | Pendiente — en alcance (D-23) |
| M9 Integración con Factusol vía n8n | Pendiente — en alcance |
| M10 Visión: simulación de color y reconocimiento de productos | Pendiente — en alcance |
| M11 Asistente inteligente | Pendiente — en alcance |
| M12 Cliente final y reservas | Pendiente — en alcance |

Detalle y riesgos: `PROJECT_STATUS.md`.

## 4. Stack verificado (versiones instaladas, 2026-10-26)

| Pieza | Versión |
|---|---|
| Next.js (App Router, build con `--webpack`) | 16.2.3 (declarado `^16.1.6`) |
| React / React DOM | 19.2.3 |
| TypeScript | 5.9.3 |
| Tailwind CSS (vía `@tailwindcss/postcss`) | 4.2.1 |
| Auth.js (`next-auth`) | 5.0.0-beta.30 |
| bcryptjs | 3.0.3 |
| TypeORM / pg | 0.3.28 / 8.20.0 |
| PostgreSQL (Docker `postgres:16`; Neon en la demo) | 16 |
| framer-motion | 12.38.0 |
| leaflet / react-leaflet | 1.9.4 / 5.0.0 |
| cloudinary | 2.9.0 |
| web-push / nodemailer | 3.6.7 / 7.0.13 |
| sharp | 0.34.5 |
| Node local / Netlify | 24.x / 22 |

Notas: `dotenv` y `@auth/core` se importan pero no están declarados (llegan como transitivas). `typeorm-ts-node-commonjs` está declarado y no se usa. `eslint-config-next` 16.1.6 no coincide con next 16.2.3. `package.json` sigue en versión `0.1.0`.

No se usan: Prisma, Drizzle, `middleware.ts`, next-pwa/workbox, Google Maps SDK, servicios de IA.

## 5. Estructura del repositorio

```
TFG-AlejandroSanzHuerta/
├─ CLAUDE.md               instrucciones para agentes
├─ README.md               presentación y puesta en marcha
├─ docker-compose.yml      PostgreSQL 16 local (cloudflared comentado)
├─ netlify.toml            despliegue demo (base app-tfg)
├─ app-tfg/                aplicación Next.js
│  ├─ app/                 páginas por rol, API routes (106), componentes
│  ├─ lib/                 dominio: auth, api, contracts, typeorm (entidades/servicios), utils, integraciones
│  ├─ migrations/typeorm/  48 migraciones
│  ├─ scripts/             tests funcionales por módulo, backup/restore, carga de imágenes
│  ├─ public/              manifest assets, sw.js, iconos, fondos
│  ├─ auth.ts              configuración Auth.js
│  └─ proxy.hosting.ts     proxy desactivado (ver DECISIONS D-07)
├─ docs/                   memoria LaTeX del TFG entregado — SOLO LECTURA, nunca modificar
├─ product-docs/           documentación del producto (copia de docs/, tono no académico) — la que se edita
├─ project-docs/           esta documentación de continuidad
└─ (ignorados) db/, examples/, presentación/, output/, app-tfg/backups/, app-tfg/.codex-artifacts/
```

Fuera del repo (`C:\Users\MADAO\Desktop\TFG\`): `ENTREGABLES_TFG/` (entrega), `DEFENSA/`, `apktool/` (APK de Kin Trends descompilada; material sensible de terceros, no subir), `docker-compose.yml` exterior (con túnel cloudflared activo), archivos de contraseñas (no abrir).

## 6. Puesta en marcha local

```powershell
docker compose up -d                 # desde la raíz del repo
cd app-tfg
npm install
# crear app-tfg/.env.local (ver variables abajo)
npm run migration:run
npm run dev                          # http://localhost:3000
```

Variables de entorno (solo nombres; no existe `.env.example` todavía):
`DATABASE_URL` (o `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`), `AUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_*_FOLDER`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `GEOCODING_*`, `OSRM_BASE_URL`, `NEXT_PUBLIC_OSRM_BASE_URL`, `ADMIN_RATE_LIMIT_SETTINGS_ENABLED`, `CLIENT_DEBUG`.

## 7. Convenciones

Ver `CLAUDE.md` (sección «Convenciones del código») y `app-tfg/README.md`.

## 8. Limitaciones conocidas

- Sin middleware activo; protección en layouts y handlers.
- Rate limiting en memoria por proceso (poco eficaz en serverless).
- Tests funcionales requieren BD con datos demo; no hay tests unitarios ni de carga.
- Dependencia de servicios públicos (OSRM, Nominatim, QuickChart).
- Sin stock, facturación ni número de pedido legible.

## 9. Documentación relacionada

- Memoria: `docs/main.tex` (PDF entregado en `ENTREGABLES_TFG/`).
- Notas internas ignoradas: `app-tfg/TFG_STATUS_MASTER_PLAN.md` (desactualizado, sustituido por `PROJECT_STATUS.md`), `app-tfg/RECENT_CHANGES.md` (integrado en `DECISIONS.md`), `app-tfg/M4_*.md`, `docs/revision-pendientes-6-9.md`, `docs/notificaciones-multicanal.md`.
