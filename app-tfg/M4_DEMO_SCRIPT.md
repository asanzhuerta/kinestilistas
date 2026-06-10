# M4 Demo Script

> Última actualización: `2026-06-01`
> Objetivo: defender `M4 - Pedidos, entregas y cobros` en `2-3` minutos sin improvisar.

## Credenciales

- `admin`: `admin@email.com / admin123$`
- `commercial`: `comercial@email.com / comercial123$`
- `client`: `lucy@email.com / lucy123$`

## Datos demo ya preparados

Cliente de referencia:

- `Salón de belleza Lucy`

Pedidos utiles:

1. `2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`
   Estado: `delivered`
   Cobro: `pending`
   Nota: `M4 demo delivered pending`
   Visita vinculada: `2bfecabf-6992-4c72-89c0-485555e53ff7`

2. `b81d7797-f488-4972-856b-3d8b2c5230c4`
   Estado: `confirmed`
   Cobro: `pending`
   Visita vinculada: `0a650fea-1ab3-4353-9e78-2d3ea26b4f60`

3. `88c50f81-6868-46cd-9e52-f1ad1b7841c4`
   Estado: `cancelled`
   Cobro: `pending`

Visitas utiles:

1. `2bfecabf-6992-4c72-89c0-485555e53ff7`
   Tipo: `delivery`
   Estado: `completed`
   Cliente: `Salón de belleza Lucy`
   Pedidos vinculados: `1`
   Nota: `M4 demo delivered pending visit`

2. `0a650fea-1ab3-4353-9e78-2d3ea26b4f60`
   Tipo: `delivery`
   Estado: `planned`
   Cliente: `Salón de belleza Lucy`
   Pedidos vinculados: `1`

3. `531f20a0-6bf2-455e-b4e6-424bceb04a14`
   Tipo: `delivery`
   Estado: `postponed`
   Cliente: `Peluqueria Jose`
   Pedidos vinculados: `0`
   Nota: `QA visit A cancellation path`

## Guion corto de defensa

### 1. Cliente

Ruta:

- `/clients/orders`

Que ensenar:

- El cliente ve solo sus pedidos.
- En el historial aparecen ejemplos reales de `confirmed`, `delivered` y `cancelled`.
- Abre el detalle del pedido `2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`.

Que decir:

- "En M4 el cliente puede consultar su historial y el detalle de cada pedido."
- "Aqui ya se ve el ciclo de vida: pedido confirmado, pedido entregado y un pedido cancelado."

### 2. Comercial - reparto

Rutas:

- `/commercials/visits`
- `/commercials/visits/0a650fea-1ab3-4353-9e78-2d3ea26b4f60`

Que ensenar:

- Existe una visita `delivery` en estado `planned`.
- La visita pertenece al cliente correcto.
- La visita tiene un pedido vinculado.

Que decir:

- "El comercial organiza y consulta los repartos pendientes."
- "Cada visita de reparto queda vinculada a pedidos concretos del cliente correcto."

### 3. Comercial - cobro

Ruta:

- `/commercials/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`

Que ensenar:

- El pedido `2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2` debe aparecer como entregado y con seguimiento de cobro visible.
- Registra o actualiza el cobro en directo si quieres cerrar la demo con una accion visible.

Que decir:

- "Una vez entregado, el pedido pasa al flujo mínimo de cobro."
- "El cobro queda integrado en el propio detalle del pedido para no duplicar pantallas comerciales."

### 4. Admin - trazabilidad global

Ruta:

- `/admin/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`

Que ensenar:

- Estado del pedido.
- Estado del cobro.
- Cliente.
- Líneas del pedido.
- Visita vinculada.

Que decir:

- "El admin tiene visibilidad completa del pedido y su trazabilidad."
- "Aqui se conecta el pedido con el reparto y con el estado de cobro."

## Orden recomendado de la demo

1. Entrar como `client` y abrir `/clients/orders`.
2. Mostrar el pedido `delivered` y el pedido `cancelled`.
3. Cambiar a `commercial` y abrir `/commercials/visits`.
4. Mostrar la visita `planned` con pedido vinculado.
5. Ir al detalle del pedido en `/commercials/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`.
6. Registrar el cobro del pedido si quieres terminar con un cambio de estado en vivo.
7. Cambiar a `admin` y abrir `/admin/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`.
8. Confirmar que el estado final del pedido y del cobro queda reflejado globalmente.

## Frases utiles para la defensa

- "M4 cubre el flujo pedido -> reparto -> entrega -> cobro mínimo."
- "No estoy cubriendo pagos parciales, facturación ni conciliación avanzada; eso queda fuera de alcance."
- "La aplicación ya soporta los roles implicados y la trazabilidad entre pedido, visita de reparto y cobro."

## Riesgos conocidos antes de la defensa

- `next build --webpack` ya pasa en local sin depender de `Google Fonts`.
- El alcance de cobros sigue siendo mínimo: no cubre pagos parciales, facturación ni conciliación avanzada.

## Nota operativa

- Si ensayas el cobro en directo y el pedido deja de estar `pending`, reutiliza el pedido `confirmed` para la parte de reparto o vuelve a dejar el cobro en `pending` antes de la defensa si tu flujo actual lo permite.
