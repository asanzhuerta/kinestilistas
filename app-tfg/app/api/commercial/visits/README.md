# API visitas comercial

Endpoints de visitas del comercial.

## Funcion

Crear, consultar y actualizar visitas a clientes asignados.

Reglas recientes a tener presentes:

- las visitas de reparto comparten planificacion y ETA con la vista de rutas del comercial y con la ETA que ve el cliente;
- si una visita de reparto se aplaza, los repartos asociados quedan liberados para poder reasignarse;
- las operaciones privadas mantienen rate limiting activo tambien desde servidor mediante `enforceApiRateLimit(request)` en despliegues donde no se usa `proxy.ts`.
