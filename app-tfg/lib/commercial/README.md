# Dominio comercial

Lógica de visitas, rutas, planificación diaria y estimación operativa.

## Función

Calcular rutas, ordenar visitas, estimar llegada y preparar datos para mapas o paneles comerciales.

OSRM se usa para estimar duraciones reales por carretera entre paradas cuando esta disponible. Si el servicio externo no responde, la planificacion conserva un fallback local por distancia aproximada para no bloquear la operativa.

La actividad comercial combina reglas de negocio con servicios externos como geocodificación y OSRM. Separarla de la UI facilita pruebas y mantenimiento.
