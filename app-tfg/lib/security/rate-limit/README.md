# Rate limiting

Implementación de límites de petición.

## Función

Proteger endpoints sensibles frente a abuso o errores de cliente.

Las políticas viven en `policies.ts` y se aplican desde dos capas:

- `app-tfg/proxy.hosting.ts`, cuando el hosting permite activar el proxy global de Next.js como `proxy.ts`.
- `lib/api/server.ts`, mediante `enforceApiRateLimit(request)`, para que los Route Handlers mantengan rate limiting incluso en Netlify.
