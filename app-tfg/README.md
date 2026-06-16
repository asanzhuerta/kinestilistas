# App TFG

Aplicación principal de Kinestilistas. Esta carpeta contiene el producto software desarrollado para el TFG: interfaz, API, autenticación, persistencia, migraciones, assets públicos y scripts de comprobación.

## Función de esta carpeta

- Centralizar el código ejecutable de la aplicación.
- Separar la app de la memoria LaTeX, la configuración de Docker.
- Mantener una estructura compatible con Next.js App Router y TypeORM.

## Estructura principal

- `app/`: rutas, layouts, páginas, API handlers y componentes de UI.
- `lib/`: lógica de dominio, contratos, servicios, seguridad, integraciones y acceso a datos.
- `migrations/`: migraciones versionadas de TypeORM.
- `public/`: imágenes, iconos, fondos y manifest PWA.
- `scripts/`: pruebas funcionales automatizadas, carga de imágenes y tareas auxiliares.

## Estado funcional destacado

- `M3` incorpora una consulta de coloración en tres modos: filas por tono principal, cartas desplegables y listado completo de tonos.
- `M4` diferencia pedido y reparto: un pedido confirmado puede prepararse en uno o varios repartos con bultos manuales, etiqueta propia y validación de entrega por QR.
- `M4` registra pagos parciales en una tabla propia para conservar historial de cobros y saldo pendiente.
- `M4/M7` permite elegir entrega por comercial o por agencia; la agencia añade un cargo configurable desde administración y genera una etiqueta diferenciada.

## Criterios de limpieza y reutilización

- Los helpers transversales viven en `lib/utils/`: fechas, zona horaria, dinero, CSV, búsqueda normalizada y validación básica.
- Las llamadas `fetch` desde componentes cliente deben usar `requestJson`, `jsonRequestOptions` y `getClientErrorMessage` de `lib/api/client.ts` para evitar repetir parseo de errores, cabeceras y serialización JSON.
- Los mensajes de feedback reutilizables deben apoyarse en `app/components/ui/FeedbackMessage.tsx`; las clases comunes de formularios se centralizan en `app/components/ui/form-styles.ts`.
- Los servicios TypeORM pueden conservar errores de dominio propios, pero deben delegar normalización genérica, parseo monetario, fechas y repositorios de configuración en helpers compartidos.
- Los componentes grandes de módulos complejos se dividen por responsabilidad: orquestación en hooks, APIs cliente en ficheros propios y paneles visuales separados por pestaña o bloque funcional.

## Archivos de entrada relevantes

- `auth.ts`: configuración de Auth.js, credenciales, sesiones y trazabilidad de acceso.
- `proxy.hosting.ts`: proxy de seguridad preparado para despliegues Next.js compatibles. Si el hosting soporta correctamente `proxy.ts`, puede renombrarse para reactivar rate limiting previo, compatibilidad de navegador y redirecciones por sesión/rol antes de llegar a la app.
- Protección de rutas: los layouts de `/admin`, `/commercials` y `/clients` validan la sesión en servidor mediante `requireAdminSession`, `requireCommercialSession` y `requireClientSession`; las APIs privadas validan rol con `requireRoleUser`.
- Netlify: no se publica un `proxy.ts` activo porque el runtime de Netlify para Next.js 16 genera una Edge Function incompatible en este despliegue (`nextHandler is not a function`). Para la demo, el rate limiting se ejecuta dentro de cada Route Handler con `enforceApiRateLimit`, y la protección de sesión/rol queda en layouts y endpoints de servidor.
- `next.config.ts`: configuración de Next.js.
- `package.json`: scripts, dependencias y comandos de desarrollo.
- `tsconfig.typeorm.json`: configuración TypeScript específica para TypeORM y migraciones.

## Scripts recomendados

```bash
npm run typecheck
npm run lint
npm run build
npm run migration:run
npm run test:m5:visual-results
npm run test:m6
npm run test:m7
npm run test:business
npm run catalog:upload-product-images -- --dry-run
```

## Notas de trabajo

- Las migraciones se crean con `npm run migration:create`.
- El puerto local esperado para desarrollo es `3000`.
