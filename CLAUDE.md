# CLAUDE.md — Instrucciones para agentes

Proyecto: **Kinestilistas**, TFG «Aplicación web progresiva para la gestión comercial en la distribución de productos capilares». Entregado el 2026-06-24 (tag `v1.0.0`); el trabajo actual es continuación posterior a la entrega.

## REGLA ABSOLUTA: la memoria del TFG es de solo lectura

`docs/` contiene la memoria académica entregada y evaluada. **Nunca** se modifica, mueve, borra, recompila ni se añaden archivos dentro de `docs/`, bajo ningún concepto. Solo se puede leer.

- La documentación del producto (mismo formato LaTeX, tono no académico) está en `product-docs/`: es la única memoria que se edita.
- La documentación de continuidad para agentes está en `project-docs/`.
- Si una tarea parece requerir tocar `docs/`, detente y pregunta.

## Lee primero

1. `project-docs/PROJECT_STATUS.md` — estado actual, riesgos y siguiente trabajo.
2. `project-docs/PROJECT_CONTEXT.md` — qué es el proyecto, stack verificado, estructura.
3. `project-docs/ARCHITECTURE.md` — flujos, auth, BD, integraciones.
4. `project-docs/DECISIONS.md` — decisiones ya tomadas; no las reabras sin motivo.
5. `project-docs/ROADMAP.md` — tareas priorizadas con criterios de aceptación.
6. `project-docs/AUDIT_REPORT.md` — **solo local, ignorado por Git** (contiene detalle de vulnerabilidades abiertas). Puede no existir en otros clones.

La fuente de verdad es el código. Si un documento contradice al código, verifica y actualiza el documento.

## Reglas de trabajo

- Responde en español. Distingue hechos verificados, inferencias e hipótesis.
- No modifiques código, configuración, dependencias, BD ni estado de Git sin aprobación expresa del propietario. Antes de un cambio sustancial presenta: objetivo, archivos afectados, riesgos y forma de verificar.
- Nada de commit, push, merge, rebase, reset, checkout de ramas, `stash pop/drop` ni borrado de ramas sin autorización.
- No ejecutes `migration:run`, `migration:revert`, `db:restore-data`, `db:prepare-demo` ni `test:all` (este último ejecuta `migration:run`) sin confirmar antes a qué `DATABASE_URL` apuntan.
- No leas ni muestres secretos: `app-tfg/.env*`, `../contraseñas.txt`, `../DEFENSA/contraseñas.md`, `app-tfg/backups/*.sql`. Cita solo nombres de variables.
- El repositorio de GitHub es público: no commitees credenciales, volcados, datos personales ni descripciones de vulnerabilidades no corregidas.
- Cambios localizados; sin dependencias nuevas sin justificar; no elimines archivos por intuición.
- No des nada por funcionando sin haberlo ejecutado. Comandos preferidos para Windows/PowerShell.
- Al cerrar una tarea, actualiza `project-docs/PROJECT_STATUS.md` (y `DECISIONS.md` si se tomó una decisión).

## Comandos (desde `app-tfg/`)

```powershell
npm run typecheck          # tsc --noEmit (escribe tsconfig.tsbuildinfo, ignorado)
npm run lint               # eslint .
npm run build              # next build --webpack (genera .next)
npm run dev                # borra .next y arranca next dev --webpack en :3000
npm run migration:show     # requiere BD; solo lectura
npm run test:business      # requiere BD con datos demo
npm run test:modules       # requiere BD con datos demo
```

BD local: `docker compose up -d` desde la raíz del repo (PostgreSQL 16, puerto 5432).

## Convenciones del código

- Next.js 16 App Router. Layouts por rol (`app/admin`, `app/commercials`, `app/clients`) validan sesión con `requireAdminSession` / `requireCommercialSession` / `requireClientSession` (`lib/auth/require-session.ts`).
- Cada route handler: `enforceApiRateLimit(request)` → `requireRoleUser(...)` → servicio en `lib/typeorm/services/**` → `jsonFromError` (`lib/api/server.ts`).
- Contratos de API en `lib/contracts/`; helpers compartidos en `lib/utils/` (fechas, dinero en céntimos, CSV, texto, validación).
- Fetch desde componentes cliente: `requestJson`, `jsonRequestOptions`, `getClientErrorMessage` (`lib/api/client.ts`).
- UI compartida: `app/components/ui/FeedbackMessage.tsx`, `form-styles.ts`, `SafeForm`.
- Migraciones TypeORM en `app-tfg/migrations/typeorm/` con formato `<timestamp>-<NNN>-<mX>-<descripcion>.ts`. TypeORM ordena por **timestamp**, no por NNN. Nunca renombres el timestamp de una migración ya aplicada.
- `synchronize` está desactivado; todo cambio de esquema va en migración revisable. Las entidades no declaran índices parciales ni CHECK: revisa cualquier `migration:generate`.
- No hay `proxy.ts` activo (ver `DECISIONS.md`, D-07).
