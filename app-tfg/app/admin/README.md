# área administrador

Rutas protegidas para usuarios con rol `admin`.

## Función

Permitir la gestión funcional del sistema: usuarios, clientes, asignaciones, catálogo, comunicaciones, pedidos, auditoría y ajustes visibles.

El administrador necesita una navegación y permisos distintos al cliente y al comercial. Esta carpeta separa esas pantallas y evita mezclar responsabilidades por rol.

Las pantallas de diagnóstico técnico de `M7` se mantienen fuera del flujo principal. Auditoría y ajustes de avisos sí son funciones del administrador; inventarios internos, soporte técnico, configuración de rate limiting e integraciones empresariales reales quedan como infraestructura de desarrollo o como base para el futuro bloque Factusol/n8n.
