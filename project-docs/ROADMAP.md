# Roadmap

> Última revisión: 2026-10-26. Prioridades: P0 crítica, P1 alta, P2 media, P3 baja.
> Una tarea está **terminada** cuando: cumple sus criterios de aceptación, `npm run typecheck` y `npm run lint` pasan, los tests afectados se han ejecutado contra BD demo (o se indica por qué no), no hay migraciones sin revisar y `PROJECT_STATUS.md` está actualizado.

## Fase 0 — Seguridad (P0)

Detalle técnico de cada SEC en `AUDIT_REPORT.md` (local).

| Id | Tarea | Depende de | Criterios de aceptación |
|---|---|---|---|
| F0-1 | SEC-01: excluir campos sensibles de usuario de toda respuesta (`select: false` + DTOs explícitos) | — | Ninguna respuesta JSON de la API contiene `password_hash`; login y cambio de contraseña siguen funcionando |
| F0-2 | SEC-02: restringir lectura de clientes por comercial a sus asignados | — | Comercial recibe 403 sobre cliente no asignado; asignado sigue accesible |
| F0-3 | SEC-03: borrados en Cloudinary solo a partir de URLs guardadas en BD del propio recurso | — | Peticiones con URL ajena no borran nada; flujos de reemplazo de imagen siguen limpiando la anterior |
| F0-4 | SEC-04: revocar sesiones al cambiar rol, estado o editar usuario (o revalidar rol/estado en el callback `jwt`) | — | Usuario bloqueado o con rol cambiado pierde acceso en la siguiente petición |
| F0-5 | SEC-05: retirar credenciales demo de ficheros versionados; decidir purga de historial y rotación en demo | Decisión del propietario | Sin contraseñas en claro en el árbol; credenciales de cualquier entorno desplegado cambiadas |
| F0-6 | Tests de regresión de autorización para F0-1…F0-4 (script en `scripts/`) | F0-1…F0-4 | Script nuevo integrado en `test:modules` y en verde |

## Fase 1 — Verificación con BD demo (P1)

| Id | Tarea | Criterios |
|---|---|---|
| F1-1 | Corregir DB-02 (backup: fechas como texto, `setval` de secuencias) | Backup → restore conserva fechas y permite nuevos inserts en logs |
| F1-2 | Levantar BD demo local y ejecutar `migration:show` (DB-01) | Ninguna migración pendiente inesperada; si las hay, plan documentado |
| F1-3 | Ejecutar `test:business`, `test:modules`, `test:m2:route-points`, `build` | Resultados registrados en `PROJECT_STATUS.md` |
| F1-4 | Añadir `test:m2:route-points` a `test:modules` | Incluido y en verde |
| F1-5 | Crear `app-tfg/.env.example` con nombres de variables | Arranque documentado sin secretos |

## Fase 2 — Integridad de datos y lógica (P1)

| Id | Tarea | Criterios |
|---|---|---|
| F2-1 | Bloqueo `pessimistic_write` del pedido en cobros, transiciones, cancelación y creación (límite de 2 abiertos) | Test concurrente: dos cobros simultáneos no superan el total |
| F2-2 | Cancelar `order_deliveries` activos al cancelar un pedido | Repartos de pedidos cancelados no aparecen en preparación ni en visitas |
| F2-3 | Test del límite de 2 pedidos abiertos sin cobrar | Script en verde |
| F2-4 | Proteger borrado de segmentos de rango (silver/gold/platinum) | No se pueden borrar; las promociones no se vuelven globales |
| F2-5 | Fecha de negocio en `Europe/Madrid` para vigencia de promociones y rangos | Test con hora 00:30 Madrid |
| F2-6 | Re-autenticación para cambiar email/contraseña en `/api/profile`; política y revocación en reset por admin (SEC-06, SEC-11) | Tests en verde |
| F2-7 | Rate limit persistente (tabla Postgres) e IP de cabecera de confianza (SEC-07) | Límite efectivo entre instancias |
| F2-8 | Sincronizar perfil al cambiar rol (`updateUserRole`) | Usuario cambiado a comercial tiene fila en `commercials` |

## Fase 3 — Calidad (P2/P3)

| Id | Pri. | Tarea |
|---|---|---|
| F3-1 | P2 | `error.tsx` por zona de rol y `global-error.tsx`; corregir `not-found` para anónimos |
| F3-2 | P2 | Accesibilidad de modales y drawer (Escape, foco, `role="dialog"`), `aria-live` en feedback |
| F3-3 | P2 | Decidir M7 huérfano: conectar o retirar `AdminEnterpriseOperationsWorkspace`, `AdminRateLimitSettingsForm`, redirecciones; corregir falso «ready» del guard de navegador |
| F3-4 | P2 | Alinear entidades con esquema (DB-04) mediante migración revisable; decidir modelo antiguo `CommercialRoute` |
| F3-5 | P2 | Cabeceras de seguridad (CSP, HSTS, frame-ancestors…), neutralizar fórmulas en CSV, validar endpoints de push (SEC-08…SEC-15) |
| F3-6 | P2 | Revisar ramas `fix/route-planning-persistence` y `fix/react-doctor-audit` (integrar o descartar) |
| F3-7 | P2 | Corregir FK compuestas de subcategorías (DB-05) |
| F3-8 | P3 | Paginación y división de la consulta base de pedidos; pool de conexiones para serverless |
| F3-9 | P3 | Limpieza: componentes huérfanos (`BottomNav`, `AnimatedLink`, `DataTable`…), `framer-motion` `layout` con `domAnimation`, CSS (`text-1xl`, imagen inexistente en `HeaderTitle`), versión de `package.json`, ramas fusionadas, `.codex-artifacts` |
| F3-10 | P3 | Declarar `dotenv` y `@auth/core`; alinear `eslint-config-next` con next |

## Fase 4 — Evolución (según objetivo del propietario)

- M4: número de pedido legible, notificaciones de cambio de estado, cancelación por el cliente.
- M5: borrar clientes del salón, editar plantillas, consentimiento RGPD.
- M6: planificador para recordatorios.
- M7/M8: primer webhook n8n real que registre `integration_operations` (Factusol); IA y simulación de color solo si entran en alcance.
- Memoria/defensa: corregir contradicciones detectadas (recuperación de contraseña, pruebas de integración, metodología en futuro, URL de demo).
