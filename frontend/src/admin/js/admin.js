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
        case 'colores':
            cargarColores();
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
        <div class="form-container">
            <h3>Agregar Nuevo Usuario</h3>
            <form id="formUsuario">
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
                <button type="button" onclick="guardarUsuario()" class="btn btn-primary">Guardar Usuario</button>
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
    const nombre = document.getElementById('nombre').value;
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    const rol = document.getElementById('rol').value;
    const activo = document.getElementById('activo').checked;
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, usuario, password, rol, activo })
        });
        
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
    // Implementación futura
    alert('Funcionalidad de edición pendiente');
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
        <div class="form-container">
            <h3>Agregar Nuevo Transportista</h3>
            <form id="formTransportista">
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
                <button type="button" onclick="guardarTransportista()" class="btn btn-primary">Guardar Transportista</button>
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
    const empresa = document.getElementById('empresa').value;
    const nombre_chofer = document.getElementById('nombre_chofer').value;
    const documento = document.getElementById('documento').value;
    const matricula = document.getElementById('matricula').value;
    const activo = document.getElementById('activoTransportista').checked;
    
    try {
        const response = await fetch('/api/admin/transporters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ empresa, nombre_chofer, documento, matricula, activo })
        });
        
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
    // Implementación futura
    alert('Funcionalidad de edición pendiente');
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

// Funciones para colores de etiqueta
function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Acepta "RRGGBB" o "#rrggbb"; devuelve "#RRGGBB" o null si no es válido
function normalizarHex(valor) {
    let hex = (valor || '').trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex.toUpperCase() : null;
}

let coloresCargados = [];

async function cargarColores() {
    try {
        const response = await fetch('/api/admin/colores-etiqueta?pagina=1&por_pagina=100', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al cargar colores de etiqueta');
        }

        const data = await response.json();
        coloresCargados = data.colores;
        mostrarColores(data);
    } catch (error) {
        console.error('Error cargando colores de etiqueta:', error);
        document.getElementById('contenido-principal').innerHTML =
            '<div class="error-message">Error al cargar colores de etiqueta</div>';
    }
}

function mostrarColores(data) {
    const contenido = document.getElementById('contenido-principal');
    let html = `
        <h2>Gestión de Colores de Etiqueta</h2>
        <div class="form-container">
            <h3 id="tituloFormColor">Agregar Nuevo Color</h3>
            <form id="formColor">
                <input type="hidden" id="colorId">
                <div class="form-group">
                    <label for="nombreColor">Nombre:</label>
                    <input type="text" id="nombreColor" maxlength="50" required>
                </div>
                <div class="form-group">
                    <label for="hexColorTexto">Color:</label>
                    <div class="color-input-group">
                        <input type="color" id="hexColorPicker" value="#FFFFFF"
                            oninput="document.getElementById('hexColorTexto').value = this.value.toUpperCase()">
                        <input type="text" id="hexColorTexto" value="#FFFFFF" maxlength="7" placeholder="#RRGGBB"
                            oninput="sincronizarPickerColor(this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="activoColor" checked> Activo
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="guardarColor()" class="btn btn-primary">Guardar Color</button>
                    <button type="button" onclick="limpiarFormColor()" class="btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Color</th>
                        <th>Hex</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.colores.forEach(color => {
        html += `
            <tr>
                <td>${color.id}</td>
                <td><span class="swatch-color" style="background:${escaparHtml(color.hex)}"></span>${escaparHtml(color.nombre)}</td>
                <td>${escaparHtml(color.hex)}</td>
                <td>${color.activo ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editarColor(${color.id})">Editar</button>
                    <button class="action-btn btn-delete" onclick="eliminarColor(${color.id})">Eliminar</button>
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

function sincronizarPickerColor(valor) {
    const hex = normalizarHex(valor);
    if (hex) document.getElementById('hexColorPicker').value = hex;
}

function limpiarFormColor() {
    document.getElementById('colorId').value = '';
    document.getElementById('nombreColor').value = '';
    document.getElementById('hexColorPicker').value = '#FFFFFF';
    document.getElementById('hexColorTexto').value = '#FFFFFF';
    document.getElementById('activoColor').checked = true;
    document.getElementById('tituloFormColor').textContent = 'Agregar Nuevo Color';
}

async function guardarColor() {
    const id = document.getElementById('colorId').value;
    const nombre = document.getElementById('nombreColor').value.trim();
    const hex = normalizarHex(document.getElementById('hexColorTexto').value);
    const activo = document.getElementById('activoColor').checked;

    if (!nombre) {
        alert('El nombre es obligatorio');
        return;
    }
    if (!hex) {
        alert('Color inválido: use el formato #RRGGBB');
        return;
    }

    try {
        const response = await fetch(id ? `/api/admin/colores-etiqueta/${id}` : '/api/admin/colores-etiqueta', {
            method: id ? 'PUT' : 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, hex, activo })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Color guardado correctamente');
            cargarColores();
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar el color'));
        }
    } catch (error) {
        console.error('Error guardando color:', error);
        alert('Error de conexión');
    }
}

function editarColor(id) {
    const color = coloresCargados.find(c => c.id === id);
    if (!color) return;

    document.getElementById('colorId').value = color.id;
    document.getElementById('nombreColor').value = color.nombre;
    document.getElementById('hexColorPicker').value = color.hex;
    document.getElementById('hexColorTexto').value = color.hex;
    document.getElementById('activoColor').checked = !!color.activo;
    document.getElementById('tituloFormColor').textContent = `Editar Color #${color.id}`;
    document.getElementById('formColor').scrollIntoView({ behavior: 'smooth' });
}

async function eliminarColor(id) {
    if (!confirm('¿Está seguro de que desea eliminar este color?')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/colores-etiqueta/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Color eliminado correctamente');
            cargarColores();
        } else if (response.status === 409 && data.puede_desactivar) {
            if (confirm(`${data.error}.\n\n¿Desea desactivarlo? Dejará de aparecer en la app.`)) {
                await desactivarColor(id);
            }
        } else {
            alert('Error: ' + (data.error || 'No se pudo eliminar el color'));
        }
    } catch (error) {
        console.error('Error eliminando color:', error);
        alert('Error de conexión');
    }
}

async function desactivarColor(id) {
    try {
        const response = await fetch(`/api/admin/colores-etiqueta/${id}/desactivar`, {
            method: 'PATCH',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Color desactivado correctamente');
            cargarColores();
        } else {
            alert('Error: ' + (data.error || 'No se pudo desactivar el color'));
        }
    } catch (error) {
        console.error('Error desactivando color:', error);
        alert('Error de conexión');
    }
}
