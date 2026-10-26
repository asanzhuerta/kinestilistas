# Estado del proyecto

> Última actualización: 2026-10-26 — auditoría inicial de continuidad (solo lectura).
> Sustituye a `app-tfg/TFG_STATUS_MASTER_PLAN.md` (revisión 2026-06-12, desactualizado).
> Los hallazgos de seguridad se identifican aquí solo por código (SEC-xx); el detalle está en `AUDIT_REPORT.md` (local, ignorado por Git).

## 1. Situación general

- TFG entregado el 2026-06-24; código = tag `v1.0.0`. Sin cambios de código desde entonces.
- Rama de trabajo: `master` (sincronizada con `origin/master`). `dev` está integrada y sin uso desde 2026-06-15.
- M1–M7 implementados; M8 e integración Factusol/n8n solo documentados.
- Hay hallazgos de seguridad abiertos de prioridad P0 (SEC-01 a SEC-05) que conviene corregir antes de cualquier otro desarrollo o de mantener la demo pública.

## 2. Últimas comprobaciones

| Fecha | Comprobación | Resultado |
|---|---|---|
| 2026-10-26 | `tsc --noEmit --incremental false` | OK, 0 errores |
| 2026-10-26 | `eslint .` | OK, 0 errores/avisos |
| 2026-10-26 | `npm run build` | No ejecutado |
| 2026-10-26 | Tests funcionales `test:*` | No ejecutados (requieren BD con datos demo) |
| 2026-10-26 | `migration:show` | No ejecutado (sin acceso a BD) |
| 2026-06-18 | `test:all` según la memoria | 22 comprobaciones superadas (no reverificado) |

## 3. Estado por módulo

Estados: **Cubierto por test (no ejecutado)** = existe script en `app-tfg/scripts/`; **Sin verificar** = implementado sin test.

### M1 — Usuarios y autenticación
- Login, solicitudes de alta, alta directa, cambio de contraseña propio: cubiertos por test.
- Cambio de rol/estado, baja, reset por admin, rechazo de solicitud: sin verificar.
- Auditoría de accesos y exportación CSV: implementada (export cubierto por test); solo registra accesos y acciones sobre usuarios.
- Problemas: SEC-01, SEC-02, SEC-04; cambio de rol no crea perfil `clients`/`commercials`; ver P1/P2 en `ROADMAP.md`.

### M2 — Gestión comercial
- Comerciales, ficha de cliente con geodatos, asignaciones con histórico, visitas (rutina/reparto; planificada/completada/cancelada/aplazada): cubiertos por test.
- Ruta diaria con ETA (OSRM + fallback): cubierta por test sin BD (`test:m2:route-points`, no incluido en `test:modules`).
- Geocodificación Nominatim y mapas Leaflet: sin verificar.
- APIs `admin/commercial-routes*` y `admin/commercial-visits*` sin pantalla que las use (modelo antiguo `CommercialRoute`).
- Rama no integrada con trabajo propio: `fix/route-planning-persistence`.

### M3 — Catálogo y coloración
- CRUD de categorías, líneas, subcategorías jerárquicas y productos: cubierto por test. Cartas, referencias de color y recursos: sin verificar.
- Consulta para cliente y comercial (filas por tono, cartas, tonos): sin verificar.
- Sin stock; `erp_reference` no sincronizado con ningún ERP.

### M4 — Pedidos, repartos y cobros
- Borradores, creación, transiciones, repartos parciales, etiquetas QR, validación de entrega, ETA al cliente, cobros parciales: cubiertos por test.
- Límite de 2 pedidos abiertos sin cobrar: implementado, sin test (la checklist interna afirma lo contrario).
- Entrega por agencia con cargo configurable: sin verificar.
- Problemas: cobros y límite de pedidos sin bloqueo (concurrencia); al cancelar un pedido no se cancelan sus `order_deliveries`; el cliente no puede cancelar su pedido; sin notificaciones de cambio de estado.

### M5 — Fichas técnicas de salón
- Clientes del salón, servicios con ficha técnica, productos/tonos usados, imágenes de resultado, plantillas, sugerencias por frecuencia, borrador de correo técnico (`mailto:`): cubiertos por test.
- Pendiente: borrar cliente del salón, editar plantillas, consentimiento/RGPD de clientes finales.

### M6 — Comunicaciones y promociones
- Rangos Plata/Oro/Platino (Plata por defecto), visibilidad de promociones, descuento porcentual en pedidos: cubiertos por test.
- Descuento por volumen, formaciones con aforo, recordatorios, recálculo manual de rangos: sin verificar.
- Problemas: borrar un segmento de rango convierte sus promociones en globales; la vigencia de promociones usa la fecha UTC; aforo de formaciones sin bloqueo; recordatorios sin cron.

### M7 — Administración e integraciones
- Ajustes (pedidos/agencia, rangos, canales de aviso), auditoría y exportación: implementados.
- Diagnóstico de rate limit, inventario de integraciones, informe operativo CSV, operaciones empresariales: cubiertos por test pero **sin UI conectada** (`AdminEnterpriseOperationsWorkspace`, `AdminRateLimitSettingsForm` huérfanos; `/admin/integrations`, `/support`, `/configuration`, `/enterprise-operations` redirigen).
- `lib/support/operational-support.ts` informa `browser-compatibility-guard` como listo aunque el proxy está desactivado (falso positivo).

### M8 — Funcionalidades avanzadas
- Pendiente: IA, simulación de color, herramientas para cliente final, chatbot, reservas, Factusol/n8n (solo stub y estudio en la memoria).

## 4. Riesgos y errores conocidos

| Id | Prioridad | Resumen (sin detalle explotable) |
|---|---|---|
| SEC-01 | P0 | Datos sensibles de usuario incluidos en respuestas de API |
| SEC-02 | P0 | Control de acceso insuficiente en un endpoint de clientes para el rol comercial |
| SEC-03 | P0 | Operación de borrado de recursos en Cloudinary sin comprobar propiedad |
| SEC-04 | P0 | Cambios de rol/estado no invalidan sesiones existentes |
| SEC-05 | P0 | Datos y credenciales de prueba en el historial / ficheros versionados de un repo público |
| SEC-06..12 | P1–P2 | Re-autenticación en cambios de credenciales, rate limit persistente, registro público, CSV, cabeceras, etc. |
| DB-01 | P1 | Migraciones 018/035/041/042 renombradas de timestamp el 2026-06-12: comprobar `migration:show` en cada BD |
| DB-02 | P1 | Script de backup desplaza un día las columnas `date` y desincroniza secuencias al restaurar |
| DB-03 | P1 | Concurrencia en cobros, transiciones de pedido y límite de pedidos abiertos |
| DB-04 | P2 | Deriva entidades/esquema (`clients.geolocation_*`, índices parciales y CHECK no declarados, doble fuente de verdad en cobros y entregas) |
| DB-05 | P2 | Borrar subcategorías con hijos o productos falla (FK compuestas con `SET NULL`) |
| OPS-01 | P1 | `docker-compose.yml` exterior (fuera del repo) arranca un túnel cloudflared público |
| UI-01 | P2 | Sin `error.tsx`; modales sin gestión de foco ni Escape; `not-found` redirige anónimos a login |

## 5. Trabajo pendiente priorizado

Ver `ROADMAP.md`. Orden recomendado: Fase 0 (seguridad) → Fase 1 (verificación con BD demo) → Fase 2 (integridad) → Fase 3 (calidad) → Fase 4 (evolución).

## 6. Bloqueos y dependencias

- Ejecutar tests requiere una BD con datos demo (`db:prepare-demo` restaura un backup; ver DB-02 antes de usarlo).
- SEC-05 requiere decisión del propietario (reescritura del historial y rotación de credenciales en la demo).
- Objetivo de la continuación pendiente de confirmar por el propietario (producción, portafolio u otro).

## 7. Registro de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-10-26 | Creación tras la auditoría inicial |
| 2026-10-26 | Arranque local verificado por el propietario (app funcional como en v1.0.0). Retirado del repo `scripts/find-test-user-passwords.ts` (avance parcial de SEC-05; sigue en el historial). Memoria del TFG copiada a `product-docs/` |
