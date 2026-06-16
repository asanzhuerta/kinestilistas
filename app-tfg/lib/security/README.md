# Seguridad

Utilidades de proteccion transversal.

## Funcion

Gestionar rate limiting, validaciones, compatibilidad minima y controles usados por `proxy.ts` o por la API.

La seguridad no debe depender de cada pantalla. Esta carpeta concentra reglas reutilizables y auditables.

El rate limiting se considera infraestructura tecnica. Sus politicas pueden diagnosticarse desde scripts y servicios internos, pero no deben formar parte de la configuracion diaria del administrador de negocio.

En la demo desplegada sobre Netlify, el proxy previo de Next.js se conserva como `app-tfg/proxy.hosting.ts`, pero la proteccion activa tambien se ejecuta dentro de los Route Handlers con `enforceApiRateLimit(request)`. Asi se mantiene la capa de defensa aunque el hosting no soporte correctamente `proxy.ts` en esta version del proyecto.
