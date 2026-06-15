# API recursos de apoyo

CRUD de recursos técnicos.

## Función

Gestionar documentación o enlaces asociados a catálogo.

El endpoint `POST /api/admin/catalog/upload-resource` permite subir PDF o imágenes a Cloudinary para rellenar la URL del recurso. Los PDF se sirven con `fl_attachment` para que se descarguen como `.pdf`.
