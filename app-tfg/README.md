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
- `scripts/`: scripts de smoke test, carga de imágenes y tareas auxiliares.

## Estado funcional destacado

- `M3` incorpora una consulta de coloración en tres modos: filas por tono principal, cartas desplegables y listado completo de tonos.
- `M4` diferencia pedido y reparto: un pedido confirmado puede prepararse en uno o varios repartos con bultos manuales, etiqueta propia y validación de entrega por QR.
- `M4` registra pagos parciales en una tabla propia para conservar historial de cobros y saldo pendiente.
- `M4/M7` permite elegir entrega por comercial o por agencia; la agencia añade un cargo configurable desde administración y genera una etiqueta diferenciada.

## Archivos de entrada relevantes

- `auth.ts`: configuración de Auth.js, credenciales, sesiones y trazabilidad de acceso.
- `proxy.ts`: middleware de protección de rutas, compatibilidad de navegador y rate limiting.
- `next.config.ts`: configuración de Next.js.
- `package.json`: scripts, dependencias y comandos de desarrollo.
- `tsconfig.typeorm.json`: configuración TypeScript específica para TypeORM y migraciones.

## Scripts recomendados

```bash
npm run typecheck
npm run lint
npm run build
npm run migration:run
npm run m5:salon-visual-smoke
npm run m6:closeout
npm run m7:closeout
npm run catalog:upload-product-images -- --dry-run
```

## Notas de trabajo

- Las migraciones se crean con `npm run migration:create`.
- El puerto local esperado para desarrollo es `3000`.
