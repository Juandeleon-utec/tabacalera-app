# Contrato entre Frontend y Backend para Transportistas

| Acción | Elemento frontend | Función JS | Método HTTP | URL frontend | Ruta backend real | Respuesta backend esperada | Campo JSON consumido | Estado |
|--------|------------------|------------|-------------|--------------|-------------------|---------------------------|---------------------|--------|
| Listar | Tabla de transportistas | cargarTransportistas() | GET | /api/admin/transporters?page=1&limit=20 | /api/admin/transporters | { ok: true, total: number, pagina: number, por_pagina: number, transportistas: [] } | transportistas[] | COINCIDE |
| Obtener uno para editar | Formulario de edición | editarTransportista(id) | GET | /api/admin/transporters/:id | /api/admin/transporters/:id | { ok: true, transportista: {} } | transportista | COINCIDE |
| Crear | Formulario de creación | guardarTransportista() | POST | /api/admin/transporters | /api/admin/transporters | { ok: true, transportista: {} } | transportista | COINCIDE |
| Actualizar | Formulario de edición | guardarTransportista() | PUT | /api/admin/transporters/:id | /api/admin/transporters/:id | { ok: true, transportista: {} } | transportista | COINCIDE |
| Eliminar | Botón de eliminación | eliminarTransportista(id) | DELETE | /api/admin/transporters/:id | /api/admin/transporters/:id | { ok: true, mensaje: string } | mensaje | COINCIDE |