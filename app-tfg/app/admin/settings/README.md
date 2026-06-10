# Ajustes admin

Configuración visible del sistema.

## Función

Gestionar los canales de avisos automáticos que sí forman parte del trabajo ordinario del administrador.

La configuración de rate limiting queda implementada en backend y cubierta por scripts de diagnóstico, pero no se expone en esta pantalla. Si fuese necesario revisarla en una implantación real, debe hacerse como operación técnica controlada, habilitando explícitamente `ADMIN_RATE_LIMIT_SETTINGS_ENABLED=true`, no como acción normal del rol `admin`.
