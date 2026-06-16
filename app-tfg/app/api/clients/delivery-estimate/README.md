# API ETA cliente

Endpoint de estimacion de reparto.

## Funcion

Mostrar al cliente informacion aproximada de llegada o estado de ruta.

La ETA del cliente reutiliza la misma planificacion diaria que ve el comercial para evitar calculos divergentes.

La respuesta solo expone una hora aproximada cuando existe una visita de reparto valida y coherente. Si la visita queda aplazada, se libera el reparto asociado y la API deja de inventar una ETA exacta.

Cuando OSRM esta disponible, la hora aproximada se apoya en duraciones reales por carretera. Si no responde, el sistema conserva un fallback local por distancia aproximada.
