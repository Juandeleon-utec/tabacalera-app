// Funciones para el panel de administración

// Manejo del login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', manejarLogin);
    }
});

async function manejarLogin(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, contrasena })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Redirigir al panel principal
            window.location.href = '/admin/';
        } else {
            errorMessage.textContent = data.error || 'Credenciales incorrectas';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error en login:', error);
        errorMessage.textContent = 'Error de conexión';
        errorMessage.style.display = 'block';
    }
}

// Verificar sesión activa
async function verificarSesion() {
    try {
        const response = await fetch('/api/admin/dashboard', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Si no hay sesión, redirigir al login
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '/admin/login';
    }
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/admin/login';
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        window.location.href = '/admin/login';
    }
}

// Cargar contenido del panel
function cargarContenido(seccion) {
    const contenidoPrincipal = document.getElementById('contenido-principal');
    
    switch(seccion) {
        case 'usuarios':
            cargarUsuarios();
            break;
        case 'transportistas':
            cargarTransportistas();
            break;
        default:
            contenidoPrincipal.innerHTML = '<h2>Bienvenido al panel de administración</h2>';
    }
}

// Funciones para usuarios
async function cargarUsuarios() {
    try {
        const response = await fetch('/api/admin/users?page=1&limit=20', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }
        
        const data = await response.json();
        mostrarUsuarios(data);
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        document.getElementById('contenido-principal').innerHTML = 
            '<div class="error-message">Error al cargar usuarios</div>';
    }
}

function mostrarUsuarios(data) {
    const contenido = document.getElementById('contenido-principal');
    let html = `
        <h2>Gestión de Usuarios</h2>
        <div class="form-container" id="formUsuarioContainer">
            <h3 id="usuarioFormTitle">Agregar Nuevo Usuario</h3>
            <form id="formUsuario">
                <input type="hidden" id="usuarioId">
                <div class="form-group">
                    <label for="nombre">Nombre:</label>
                    <input type="text" id="nombre" required>
                </div>
                <div class="form-group">
                    <label for="usuario">Usuario:</label>
                    <input type="text" id="usuario" required>
                </div>
                <div class="form-group">
                    <label for="password">Contraseña:</label>
                    <input type="password" id="password">
                </div>
                <div class="form-group">
                    <label for="rol">Rol:</label>
                    <select id="rol">
                        <option value="comprador">Comprador</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="activo" checked> Activo
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="guardarUsuario()" class="btn btn-primary">Guardar Usuario</button>
                    <button type="button" onclick="cancelarEdicion()" class="btn btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.usuarios.forEach(usuario => {
        html += `
            <tr>
                <td>${usuario.id}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.usuario}</td>
                <td>${usuario.rol}</td>
                <td>${usuario.activo ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editarUsuario(${usuario.id})">Editar</button>
                    <button class="action-btn btn-delete" onclick="eliminarUsuario(${usuario.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    contenido.innerHTML = html;
}

async function guardarUsuario() {
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('nombre').value;
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;
    const activo = document.getElementById('activo').checked;
    
    try {
        let response;
        let url;
        
        if (id) {
            // Actualizar usuario existente
            url = `/api/admin/users/${id}`;
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre, usuario, password, rol, activo })
            });
        } else {
            // Crear nuevo usuario
            url = '/api/admin/users';
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre, usuario, password, rol, activo })
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Usuario guardado correctamente');
            cargarUsuarios();
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar el usuario'));
        }
    } catch (error) {
        console.error('Error guardando usuario:', error);
        alert('Error de conexión');
    }
}

async function editarUsuario(id) {
    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuario');
        }
        
        const data = await response.json();
        const usuario = data.usuario;
        
        // Mostrar formulario de edición
        document.getElementById('usuarioId').value = usuario.id;
        document.getElementById('nombre').value = usuario.nombre;
        document.getElementById('usuario').value = usuario.usuario;
        document.getElementById('password').value = '';
        document.getElementById('rol').value = usuario.rol;
        document.getElementById('activo').checked = usuario.activo;
        document.getElementById('usuarioFormTitle').textContent = 'Editar Usuario';
        
        // Mostrar formulario y ocultar tabla
        document.getElementById('formUsuarioContainer').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
    } catch (error) {
        console.error('Error cargando usuario para edición:', error);
        alert('Error al cargar usuario para edición');
    }
}

function cancelarEdicion() {
    // Limpiar formulario y volver a mostrar tabla
    document.getElementById('usuarioId').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('usuario').value = '';
    document.getElementById('password').value = '';
    document.getElementById('rol').value = 'comprador';
    document.getElementById('activo').checked = true;
    document.getElementById('usuarioFormTitle').textContent = 'Agregar Nuevo Usuario';
    
    // Mostrar tabla y ocultar formulario
    document.getElementById('formUsuarioContainer').style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
}

function cancelarEdicionTransportista() {
    // Limpiar formulario y volver a mostrar tabla
    document.getElementById('transportistaId').value = '';
    document.getElementById('empresa').value = '';
    document.getElementById('nombre_chofer').value = '';
    document.getElementById('documento').value = '';
    document.getElementById('matricula').value = '';
    document.getElementById('activoTransportista').checked = true;
    document.getElementById('transportistaFormTitle').textContent = 'Agregar Nuevo Transportista';
    
    // Mostrar tabla y ocultar formulario
    document.getElementById('formTransportistaContainer').style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
}

async function eliminarUsuario(id) {
    if (!confirm('¿Está seguro de que desea eliminar este usuario?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Usuario eliminado correctamente');
            cargarUsuarios();
        } else {
            alert('Error: ' + (data.error || 'No se pudo eliminar el usuario'));
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error de conexión');
    }
}

// Funciones para transportistas
async function cargarTransportistas() {
    try {
        const response = await fetch('/api/admin/transporters?page=1&limit=20', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar transportistas');
        }
        
        const data = await response.json();
        mostrarTransportistas(data);
    } catch (error) {
        console.error('Error cargando transportistas:', error);
        document.getElementById('contenido-principal').innerHTML = 
            '<div class="error-message">Error al cargar transportistas</div>';
    }
}

function mostrarTransportistas(data) {
    const contenido = document.getElementById('contenido-principal');
    let html = `
        <h2>Gestión de Transportistas</h2>
        <div class="form-container" id="formTransportistaContainer">
            <h3 id="transportistaFormTitle">Agregar Nuevo Transportista</h3>
            <form id="formTransportista">
                <input type="hidden" id="transportistaId">
                <div class="form-group">
                    <label for="empresa">Empresa:</label>
                    <input type="text" id="empresa" required>
                </div>
                <div class="form-group">
                    <label for="nombre_chofer">Nombre del Chofer:</label>
                    <input type="text" id="nombre_chofer" required>
                </div>
                <div class="form-group">
                    <label for="documento">Documento:</label>
                    <input type="text" id="documento">
                </div>
                <div class="form-group">
                    <label for="matricula">Matrícula:</label>
                    <input type="text" id="matricula" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="activoTransportista" checked> Activo
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="guardarTransportista()" class="btn btn-primary">Guardar Transportista</button>
                    <button type="button" onclick="cancelarEdicionTransportista()" class="btn btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Empresa</th>
                        <th>Chofer</th>
                        <th>Matrícula</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.transportistas.forEach(transportista => {
        html += `
            <tr>
                <td>${transportista.id}</td>
                <td>${transportista.empresa}</td>
                <td>${transportista.nombre_chofer}</td>
                <td>${transportista.matricula}</td>
                <td>${transportista.activo ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editarTransportista(${transportista.id})">Editar</button>
                    <button class="action-btn btn-delete" onclick="eliminarTransportista(${transportista.id})">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    contenido.innerHTML = html;
}

async function guardarTransportista() {
    const id = document.getElementById('transportistaId').value;
    const empresa = document.getElementById('empresa').value;
    const nombre_chofer = document.getElementById('nombre_chofer').value;
    const documento = document.getElementById('documento').value;
    const matricula = document.getElementById('matricula').value;
    const activo = document.getElementById('activoTransportista').checked;
    
    try {
        let response;
        let url;
        
        if (id) {
            // Actualizar transportista existente
            url = `/api/admin/transporters/${id}`;
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ empresa, nombre_chofer, documento, matricula, activo })
            });
        } else {
            // Crear nuevo transportista
            url = '/api/admin/transporters';
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ empresa, nombre_chofer, documento, matricula, activo })
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Transportista guardado correctamente');
            cargarTransportistas();
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar el transportista'));
        }
    } catch (error) {
        console.error('Error guardando transportista:', error);
        alert('Error de conexión');
    }
}

async function editarTransportista(id) {
    try {
        const response = await fetch(`/api/admin/transporters/${id}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar transportista');
        }
        
        const data = await response.json();
        const transportista = data.transportista;
        
        // Mostrar formulario de edición
        document.getElementById('transportistaId').value = transportista.id;
        document.getElementById('empresa').value = transportista.empresa;
        document.getElementById('nombre_chofer').value = transportista.nombre_chofer;
        document.getElementById('documento').value = transportista.documento || '';
        document.getElementById('matricula').value = transportista.matricula;
        document.getElementById('activoTransportista').checked = transportista.activo;
        document.getElementById('transportistaFormTitle').textContent = 'Editar Transportista';
        
        // Mostrar formulario y ocultar tabla
        document.getElementById('formTransportistaContainer').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
    } catch (error) {
        console.error('Error cargando transportista para edición:', error);
        alert('Error al cargar transportista para edición');
    }
}

function cancelarEdicionTransportista() {
    // Limpiar formulario y volver a mostrar tabla
    document.getElementById('transportistaId').value = '';
    document.getElementById('empresa').value = '';
    document.getElementById('nombre_chofer').value = '';
    document.getElementById('documento').value = '';
    document.getElementById('matricula').value = '';
    document.getElementById('activoTransportista').checked = true;
    document.getElementById('transportistaFormTitle').textContent = 'Agregar Nuevo Transportista';
}

async function eliminarTransportista(id) {
    if (!confirm('¿Está seguro de que desea eliminar este transportista?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/transporters/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Transportista eliminado correctamente');
            cargarTransportistas();
        } else {
            alert('Error: ' + (data.error || 'No se pudo eliminar el transportista'));
        }
    } catch (error) {
        console.error('Error eliminando transportista:', error);
        alert('Error de conexión');
    }
}