# Cambios recientes consolidados

Este documento resume las decisiones tecnicas y funcionales aplicadas durante la fase final de consolidacion del proyecto. Su objetivo es dejar trazabilidad rapida de cambios que afectan a despliegue, seguridad, limpieza de codigo, operativa comercial y experiencia movil.

## 1. Limpieza estructural y reutilizacion

- Se han reducido duplicidades transversales moviendo helpers comunes a `lib/utils/` y reutilizando `lib/api/client.ts` para llamadas JSON y manejo de errores.
- El area administrativa de comunicaciones se ha dividido por responsabilidades: listas, formularios, overview y hook de orquestacion separados para reducir acoplamiento.
- El modulo de salon se ha reorganizado en paneles dedicados, entre ellos `SalonServiceFormPanel` y `SalonServiceHistoryPanel`.
- Se han separado componentes grandes y formularios por pestañas o bloques funcionales para mantener vistas largas mas mantenibles.

## 2. Seguridad y despliegue de demostracion

- El proxy global de Next.js se conserva en el repositorio como `proxy.hosting.ts`.
- En Netlify no se publica como `proxy.ts` por incompatibilidad detectada con el runtime Edge de Next.js 16 (`nextHandler is not a function`).
- Para no perder proteccion en la demo, el rate limiting se aplica tambien dentro de los Route Handlers con `enforceApiRateLimit(request)`.
- La proteccion por sesion y rol sigue resuelta en layouts y endpoints de servidor.
- El despliegue de demostracion queda pensado para `Netlify + Neon + Cloudinary`.
- En Netlify conviene usar la cadena pooled de Neon como `DATABASE_URL`.
- Para migraciones manuales, restauracion de datos o scripts locales es preferible usar una conexion directa a PostgreSQL cuando el proveedor la ofrezca.

## 3. Correcciones funcionales recientes

### Repartos y visitas

- Aplazar una visita de reparto libera el reparto asociado para que pueda reasignarse despues.
- La ETA de reparto visible para el cliente solo se muestra cuando existe una visita de entrega valida y coherente.

### Rutas comerciales y ETA

- La ETA de visitas y repartos ya no se calcula solo con una velocidad aproximada sobre distancia en linea recta.
- El dominio comercial usa duraciones reales por carretera obtenidas desde OSRM cuando el servicio esta disponible.
- Si OSRM falla, la planificacion mantiene un fallback local por distancia para no bloquear la operativa.
- El boton `Abrir en Google Maps` ya no incluye el regreso automatico al punto de salida como destino de navegacion inmediata.
- El punto final de jornada puede mostrar su propia ETA sin contaminar la ETA del cliente o de la visita.

### Experiencia movil

- Los modales largos de visitas y otros popups de operativa comercial usan un patron scrollable en movil para evitar que los botones finales queden inaccesibles.

## 4. Validacion aplicada

Las correcciones recientes se han validado de forma repetida con:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:m2:route-points`
- `npm run test:m7:rate-limits`

Ademas, se han hecho comprobaciones puntuales de despliegue en Netlify y de duracion real de ruta usando OSRM para casos como Cadiz -> Barbate.
