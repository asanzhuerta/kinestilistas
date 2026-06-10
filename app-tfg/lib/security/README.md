# Seguridad

Utilidades de protección transversal.

## Función

Gestionar rate limiting, validaciones, compatibilidad múmínima y controles usados por `proxy.ts` o API.

La seguridad no debe depender de cada pantalla. Esta carpeta concentra reglas reutilizables y auditables.

El rate limiting se considera infraestructura técnica. Sus políticas pueden diagnosticarse desde scripts y servicios internos, pero no deben formar parte de la configuración diaria del administrador de negocio.
