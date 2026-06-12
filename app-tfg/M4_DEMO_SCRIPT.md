# M4 Demo Script

> Última actualización: `2026-06-12`
> Objetivo: defender `M4 - Pedidos, repartos, entregas y cobros` en `3-4` minutos sin improvisar.

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

### 2. Comercial - preparación de reparto

Rutas:

- `/commercials/orders/preparation`
- `/commercials/visits`
- `/commercials/visits/0a650fea-1ab3-4353-9e78-2d3ea26b4f60`

Que ensenar:

- La preparación permite seleccionar líneas pendientes de pedidos confirmados.
- Los bultos se introducen manualmente.
- Las etiquetas se generan por reparto, no por pedido.

Que decir:

- "El pedido puede dividirse en varios repartos si no todo el producto está disponible."
- "Cada reparto tiene sus líneas, sus bultos y su etiqueta propia."

### 3. Comercial - entrega

Rutas:

- `/commercials/visits`
- `/commercials/visits/0a650fea-1ab3-4353-9e78-2d3ea26b4f60`

Que ensenar:

- Existe una visita `delivery` en estado `planned`.
- La visita pertenece al cliente correcto.
- La visita tiene repartos vinculados.

Que decir:

- "La visita de reparto ya no transporta pedidos completos de forma directa, sino repartos preparados."
- "Un pedido solo queda entregado cuando todos sus repartos comerciales están cerrados mediante QR."

### 4. Comercial - pagos

Ruta:

- `/commercials/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`

Que ensenar:

- El pedido `2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2` debe aparecer como entregado y con historial de pagos visible.
- Registra un pago parcial en directo si quieres cerrar la demo con una acción visible.

Que decir:

- "Una vez entregado, el pedido admite uno o varios pagos hasta cubrir el importe total."
- "El historial queda integrado en el propio detalle del pedido para informes posteriores."

### 5. Admin - trazabilidad global

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
4. Abrir `/commercials/orders/preparation` y mostrar la preparación de repartos con bultos manuales.
5. Mostrar la visita `planned` con reparto vinculado.
6. Ir al detalle del pedido en `/commercials/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`.
7. Registrar un pago parcial si quieres terminar con un cambio de estado en vivo.
8. Cambiar a `admin` y abrir `/admin/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`.
9. Confirmar que el estado final del pedido, los repartos y los pagos quedan reflejados globalmente.

## Frases utiles para la defensa

- "M4 cubre el flujo pedido -> preparación de repartos -> entrega -> pagos."
- "Los pagos parciales ya están modelados; lo que queda fuera son facturación, vencimientos automáticos y conciliación avanzada."
- "La aplicación ya soporta los roles implicados y la trazabilidad entre pedido, reparto, visita y pago."

## Riesgos conocidos antes de la defensa

- `next build --webpack` ya pasa en local sin depender de `Google Fonts`.
- El alcance económico cubre pagos parciales, pero no facturación, vencimientos automáticos ni conciliación avanzada.

## Nota operativa

- Si ensayas el cobro en directo y el pedido deja de estar `pending`, reutiliza el pedido `confirmed` para la parte de reparto o vuelve a dejar el cobro en `pending` antes de la defensa si tu flujo actual lo permite.
