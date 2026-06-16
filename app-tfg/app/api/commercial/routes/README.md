# API rutas comercial

Endpoints de rutas comerciales.

## Funcion

Calcular previsualizaciones y datos de ruta diaria.

La previsualizacion diaria reutiliza el dominio comercial para ordenar visitas, calcular ETA y resumir tiempo comprometido.

El comportamiento actual distingue entre dos conceptos:

- la ETA de cada visita refleja la llegada al cliente desde el punto anterior;
- el punto final de jornada puede mostrar su propia ETA aparte, incluyendo regreso al origen o destino alternativo.

Cuando OSRM esta disponible, la duracion entre tramos se calcula con tiempos reales por carretera. Si el servicio externo no responde, el sistema conserva un fallback local por distancia aproximada.
