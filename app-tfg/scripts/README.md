# Scripts de la aplicación

Scripts Node/TypeScript usados para validaciones, smoke tests, mantenimiento y cargas auxiliares.

## Función

Automatizar comprobaciones por módulo, carga de imágenes de catálogo, limpieza de fixtures y tareas operativas.

El proyecto necesita validar flujos sin depender siempre de la interfaz. Mantener scripts aquí permite ejecutarlos con el mismo entorno de la app.

## Scripts destacados

- `upload-product-images.ts`: sube imágenes de catálogo a Cloudinary y actualiza `products.image_url`.
- `business-route-smoke.ts`: valida la selección de puntos de inicio y fin de ruta.
- `business-critical-smoke.mjs`: ejecuta los smokes críticos de rutas, pedidos, repartos, cobros parciales y promociones.
- `m1-m3-closeout-smoke.ts`: comprueba alta/autorización, gestión comercial básica y catálogo con datos temporales.
- `m4-closeout-smoke.ts`: comprueba el ciclo de pedido, reparto, QR y entrega.
- `m4-partial-payment-smoke.ts`: comprueba pagos parciales, cierre de cobro e historial de pagos.
- `m5-*smoke.ts`: comprueba funcionalidades de fichas técnicas y resultado visual.
- `m6-*smoke.ts`: comprueba comunicaciones, promociones y rangos.
- `m7-*smoke.ts`: comprueba auditoría, soporte interno, operaciones técnicas, rate limiting e integraciones.
- `wave-audit.mjs`: prepara una revisión manual gratuita con WAVE. Usa por defecto el dev tunnel `https://5xkm2q9w-3000.uks1.devtunnels.ms/`, comprueba antes si responde y genera una checklist con enlaces directos al informe WAVE de cada ruta. Variables útiles: `WAVE_BASE_URL`, `WAVE_ROUTES`, `WAVE_SKIP_IF_BASE_UNAVAILABLE=false`.
- `backup-data-only.mjs`: exporta solo datos de la base, sin estructura.
- `restore-data-only.mjs`: restaura un backup de datos con confirmación explícita.
- `prepare-demo-data.mjs`: genera backup del estado actual y, opcionalmente, restaura un backup base de demo.
- `load-env.cjs`: carga variables de entorno para scripts fuera de Next.js.
