# Componentes comerciales

Componentes usados por el rol comercial.

## Funcion

Representar listados de clientes, detalles comerciales, visitas y datos operativos de ruta.

La actividad comercial mezcla agenda, clientes, pedidos y seguimiento. Separarla ayuda a mantener esta logica localizada.

Los componentes de este bloque reutilizan dos decisiones recientes:

- las ETA y ordenes de ruta deben llegar ya calculadas desde el dominio comercial para no divergir entre mapa, listados y tarjeta cliente;
- los modales largos usan el patron global scrollable para mantener accesibles los formularios en movil.
