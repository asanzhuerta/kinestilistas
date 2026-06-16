# Dominio comercial

Logica de visitas, rutas, planificacion diaria y estimacion operativa.

## Funcion

Calcular rutas, ordenar visitas, estimar llegada y preparar datos para mapas o paneles comerciales.

OSRM se usa para estimar duraciones reales por carretera entre paradas cuando esta disponible. Si el servicio externo no responde, la planificacion conserva un fallback local por distancia aproximada para no bloquear la operativa.

La ETA de una visita y la ETA del cierre de jornada se tratan como conceptos separados. El calculo de llegada al cliente no debe mezclarse con el posible regreso al origen o con el punto final alternativo del comercial.

La actividad comercial combina reglas de negocio con servicios externos como geocodificacion y OSRM. Separarla de la UI facilita pruebas y mantenimiento.
