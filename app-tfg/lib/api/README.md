# Helpers de API

Utilidades para Route Handlers y respuestas de servidor.

## Función

Centralizar control de acceso, rate limiting, manejo de errores, parseo de peticiones y respuestas comunes.

Los endpoints comparten patrones de seguridad y validación. Esta carpeta evita repetirlos en cada ruta API.

`server.ts` expone `enforceApiRateLimit(request)`, que resuelve la política aplicable según ruta y método y devuelve una respuesta `429` cuando corresponde. Los Route Handlers la ejecutan de forma explícita para no depender de middleware Edge en despliegues como Netlify.

## Cliente HTTP interno

`client.ts` contiene el contrato común para llamadas `fetch` desde componentes cliente:

- `requestJson`: lee JSON, aplica `fallbackMessage` y lanza `ApiClientError` cuando la respuesta no es correcta.
- `jsonRequestOptions`: crea opciones `POST`, `PUT`, `PATCH` o `DELETE` con cabecera JSON y `body` serializado.
- `getClientErrorMessage`: extrae un mensaje seguro para mostrar feedback sin repetir ternarios `error instanceof Error`.

Los componentes no deberían montar manualmente `headers: { "Content-Type": "application/json" }` ni `JSON.stringify` salvo que exista un caso especial justificado, como subida de `FormData`.
