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
        case 'terminales':
            cargarTerminales();
            break;
        case 'recepciones':
            cargarRecepciones();
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


// Funciones para terminales
// Se registran solas en su primera sincronización; aquí solo se edita alias y estado.
let terminalesCargadas = [];

function formatearFechaHora(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function cargarTerminales() {
    try {
        const response = await fetch('/api/admin/terminales', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al cargar terminales');
        }

        const data = await response.json();
        terminalesCargadas = data.terminales;
        mostrarTerminales(data);
    } catch (error) {
        console.error('Error cargando terminales:', error);
        document.getElementById('contenido-principal').innerHTML =
            '<div class="error-message">Error al cargar terminales</div>';
    }
}

function mostrarTerminales(data) {
    const contenido = document.getElementById('contenido-principal');
    let html = `
        <h2>Gestión de Terminales</h2>
        <p>Las terminales se dan de alta automáticamente en su primera sincronización.
           Una terminal inactiva no puede emitir remitos nuevos desde su próxima sincronización.</p>
        <div class="form-container" id="contenedorFormTerminal" style="display:none">
            <h3 id="tituloFormTerminal">Editar Terminal</h3>
            <form id="formTerminal">
                <input type="hidden" id="terminalId">
                <div class="form-group">
                    <label for="aliasTerminal">Alias:</label>
                    <input type="text" id="aliasTerminal" maxlength="50" placeholder="Ej.: PDA comprador zona norte">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="activoTerminal"> Activa
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="guardarTerminal()" class="btn btn-primary">Guardar</button>
                    <button type="button" onclick="cancelarEdicionTerminal()" class="btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Alias</th>
                        <th>Alta</th>
                        <th>Última sync</th>
                        <th>Remitos</th>
                        <th>Último remito</th>
                        <th>Activa</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.terminales.length === 0) {
        html += '<tr><td colspan="8">Todavía no hay terminales registradas</td></tr>';
    }

    data.terminales.forEach(t => {
        html += `
            <tr>
                <td><b>TER${escaparHtml(t.codigo)}</b></td>
                <td>${escaparHtml(t.alias || '—')}</td>
                <td>${formatearFechaHora(t.created_at)}</td>
                <td>${formatearFechaHora(t.ultima_sync_at)}</td>
                <td>${t.total_remitos}</td>
                <td>${t.ultimo_remito ? escaparHtml(t.ultimo_remito) + '<br><small>' + formatearFechaHora(t.ultimo_remito_at) + '</small>' : '—'}</td>
                <td>${t.activo ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editarTerminal(${t.id})">Editar</button>
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

function editarTerminal(id) {
    const t = terminalesCargadas.find(x => x.id === id);
    if (!t) return;

    document.getElementById('terminalId').value = t.id;
    document.getElementById('aliasTerminal').value = t.alias || '';
    document.getElementById('activoTerminal').checked = !!t.activo;
    document.getElementById('tituloFormTerminal').textContent = `Editar Terminal TER${t.codigo}`;
    const contenedor = document.getElementById('contenedorFormTerminal');
    contenedor.style.display = '';
    contenedor.scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicionTerminal() {
    document.getElementById('terminalId').value = '';
    document.getElementById('contenedorFormTerminal').style.display = 'none';
}

async function guardarTerminal() {
    const id = document.getElementById('terminalId').value;
    if (!id) return;
    const alias = document.getElementById('aliasTerminal').value.trim();
    const activo = document.getElementById('activoTerminal').checked;

    const t = terminalesCargadas.find(x => String(x.id) === id);
    if (t && t.activo && !activo &&
        !confirm(`¿Dar de baja TER${t.codigo}? No podrá emitir remitos nuevos desde su próxima sincronización.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/terminales/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias, activo })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Terminal actualizada correctamente');
            cargarTerminales();
        } else {
            alert('Error: ' + (data.error || 'No se pudo actualizar la terminal'));
        }
    } catch (error) {
        console.error('Error guardando terminal:', error);
        alert('Error de conexión');
    }
}

// Funciones para recepciones (histórico de envíos sincronizados)
// Solo lectura. "Reimprimir" abre el remito en otra pestaña para imprimir
// o guardar como PDF y reenviarlo al agricultor.
const POR_PAGINA_RECEPCIONES = 50;
let filtrosRecepciones = {};
let paginaRecepciones = 1;

function fechaIso(d) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function formatearFechaCorta(valor) {
    return valor ? String(valor).split('-').reverse().join('/') : '—';
}

function formatearHoraCorta(valor) {
    if (!valor) return '';
    const d = new Date(valor);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

async function cargarRecepciones() {
    const contenido = document.getElementById('contenido-principal');
    const hoy = new Date();
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 3600 * 1000);

    contenido.innerHTML = `
        <h2>Recepciones</h2>
        <p>Envíos sincronizados desde las terminales. Con <b>Reimprimir</b> se abre el remito
           para imprimirlo o guardarlo como PDF y reenviarlo al agricultor.</p>
        <div class="form-container">
            <form id="formFiltrosRecepciones" class="filtros-grid" onsubmit="buscarRecepciones(event)">
                <div class="form-group">
                    <label for="filtroDesde">Desde</label>
                    <input type="date" id="filtroDesde" value="${fechaIso(hace30)}">
                </div>
                <div class="form-group">
                    <label for="filtroHasta">Hasta</label>
                    <input type="date" id="filtroHasta" value="${fechaIso(hoy)}">
                </div>
                <div class="form-group">
                    <label for="filtroAgricultor">Agricultor (código o nombre)</label>
                    <input type="text" id="filtroAgricultor" maxlength="60">
                </div>
                <div class="form-group">
                    <label for="filtroRemito">N° de remito</label>
                    <input type="text" id="filtroRemito" maxlength="20">
                </div>
                <div class="form-group">
                    <label for="filtroUsuario">Comprador</label>
                    <select id="filtroUsuario"><option value="">Todos</option></select>
                </div>
                <div class="form-group">
                    <label for="filtroTerminal">Terminal</label>
                    <select id="filtroTerminal"><option value="">Todas</option></select>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Buscar</button>
                    <button type="button" class="btn-secondary" onclick="limpiarFiltrosRecepciones()">Limpiar</button>
                </div>
            </form>
        </div>
        <div id="detalleRecepcion"></div>
        <div id="resultadoRecepciones"></div>
    `;

    try {
        const response = await fetch('/api/admin/recepciones/opciones', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('filtroUsuario').innerHTML += data.usuarios
                .map(u => `<option value="${u.id}">${escaparHtml(u.nombre)} (${escaparHtml(u.usuario)})</option>`).join('');
            document.getElementById('filtroTerminal').innerHTML += data.terminales
                .map(t => `<option value="${escaparHtml(t.codigo)}">TER${escaparHtml(t.codigo)}${t.alias ? ' — ' + escaparHtml(t.alias) : ''}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando opciones de filtros:', error);
    }

    buscarRecepciones();
}

function limpiarFiltrosRecepciones() {
    ['filtroDesde', 'filtroHasta', 'filtroAgricultor', 'filtroRemito', 'filtroUsuario', 'filtroTerminal']
        .forEach(id => { document.getElementById(id).value = ''; });
    buscarRecepciones();
}

function buscarRecepciones(e) {
    if (e) e.preventDefault();
    filtrosRecepciones = {
        desde: document.getElementById('filtroDesde').value,
        hasta: document.getElementById('filtroHasta').value,
        agricultor: document.getElementById('filtroAgricultor').value.trim(),
        remito: document.getElementById('filtroRemito').value.trim(),
        usuario_id: document.getElementById('filtroUsuario').value,
        terminal: document.getElementById('filtroTerminal').value,
    };
    irAPaginaRecepciones(1);
}

async function irAPaginaRecepciones(pagina) {
    paginaRecepciones = pagina;
    const params = new URLSearchParams({ pagina, por_pagina: POR_PAGINA_RECEPCIONES });
    Object.entries(filtrosRecepciones).forEach(([k, v]) => { if (v) params.set(k, v); });

    const destino = document.getElementById('resultadoRecepciones');
    destino.innerHTML = '<p>Cargando…</p>';
    try {
        const response = await fetch(`/api/admin/recepciones?${params}`, { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/admin/login';
            return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al cargar recepciones');
        mostrarRecepciones(data);
    } catch (error) {
        console.error('Error cargando recepciones:', error);
        destino.innerHTML = `<div class="error-message">${escaparHtml(error.message)}</div>`;
    }
}

function mostrarRecepciones(data) {
    const totalPaginas = Math.max(Math.ceil(data.total / data.por_pagina), 1);
    const totalFardosPagina = data.recepciones.reduce((s, r) => s + r.fardos_validos, 0);

    let html = `
        <div class="resumen-recepciones">
            ${data.total} recepción(es) — ${totalFardosPagina} fardos válidos en esta página
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>N° remito</th>
                        <th>Agricultor</th>
                        <th>Comprador</th>
                        <th>Transporte</th>
                        <th>Carga</th>
                        <th>Fardos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (data.recepciones.length === 0) {
        html += '<tr><td colspan="8">No hay recepciones con esos filtros</td></tr>';
    }

    data.recepciones.forEach(r => {
        const a = r.agricultor || {};
        const t = r.transportista;
        const carga = r.hora_inicio_carga
            ? `${formatearHoraCorta(r.hora_inicio_carga)} – ${formatearHoraCorta(r.hora_fin_carga)}`
            : '—';
        const invalidos = r.total_fardos - r.fardos_validos;
        html += `
            <tr>
                <td>${formatearFechaCorta(r.fecha)}<br><small>${escaparHtml(String(r.hora || '').substring(0, 5))}</small></td>
                <td>${r.nro_remito ? '<b>' + escaparHtml(r.nro_remito) + '</b>' : '<small>sin remito</small>'}</td>
                <td>${escaparHtml(a.nombre || '—')}<br><small>${escaparHtml(a.codigo_6dig || '')}</small></td>
                <td>${escaparHtml(r.usuario?.nombre || '—')}</td>
                <td>${t ? escaparHtml(t.empresa) + '<br><small>' + escaparHtml(t.matricula) + '</small>' : '—'}</td>
                <td>${carga}</td>
                <td><b>${r.fardos_validos}</b>${invalidos > 0 ? `<br><small>+${invalidos} rechazados</small>` : ''}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="verRecepcion(${r.id})">Ver</button>
                    <button class="action-btn btn-reimprimir" onclick="reimprimirRemito(${r.id})">Reimprimir</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
        <div class="paginacion">
            <button class="btn-secondary" ${data.pagina <= 1 ? 'disabled' : ''}
                onclick="irAPaginaRecepciones(${data.pagina - 1})">‹ Anterior</button>
            <span>Página ${data.pagina} de ${totalPaginas}</span>
            <button class="btn-secondary" ${data.pagina >= totalPaginas ? 'disabled' : ''}
                onclick="irAPaginaRecepciones(${data.pagina + 1})">Siguiente ›</button>
        </div>
    `;

    document.getElementById('resultadoRecepciones').innerHTML = html;
}

function reimprimirRemito(id) {
    window.open(`/api/admin/recepciones/${id}/remito`, '_blank');
}

function estadoFardoTexto(f) {
    if (f.valido) return '<span class="estado-valido">Válido</span>';
    const motivo = escaparHtml(f.motivo_invalido || 'Inválido');
    return /duplicado/i.test(f.motivo_invalido || '')
        ? `<span class="estado-duplicado">${motivo}</span>`
        : `<span class="estado-invalido">${motivo}</span>`;
}

async function verRecepcion(id) {
    const destino = document.getElementById('detalleRecepcion');
    destino.innerHTML = '<p>Cargando…</p>';
    try {
        const response = await fetch(`/api/admin/recepciones/${id}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al cargar la recepción');
        const r = data.recepcion;
        const a = r.agricultor || {};
        const t = r.transportista;

        const filas = (r.fardos || []).map((f, i) => `
            <tr>
                <td>${i + 1}</td>
                <td class="mono">${escaparHtml(f.codigo_qr)}</td>
                <td>${estadoFardoTexto(f)}</td>
                <td>${formatearFechaHora(f.timestamp_escaneo)}</td>
            </tr>`).join('');

        destino.innerHTML = `
            <div class="form-container detalle-recepcion">
                <h3>${r.nro_remito ? 'Remito ' + escaparHtml(r.nro_remito) : 'Recepción #' + r.id}</h3>
                <div class="detalle-grid">
                    <div><b>Fecha:</b> ${formatearFechaCorta(r.fecha)} ${escaparHtml(String(r.hora || '').substring(0, 5))}</div>
                    <div><b>Agricultor:</b> ${escaparHtml(a.nombre || '—')} (${escaparHtml(a.codigo_6dig || '')})</div>
                    <div><b>Comprador:</b> ${escaparHtml(r.usuario?.nombre || '—')}</div>
                    <div><b>Terminal:</b> ${r.terminal_codigo ? 'TER' + escaparHtml(r.terminal_codigo) : '—'}</div>
                    <div><b>Transporte:</b> ${t ? escaparHtml(t.empresa) + ' — ' + escaparHtml(t.nombre_chofer) + ' — ' + escaparHtml(t.matricula) : '—'}</div>
                    <div><b>Color etiqueta:</b> ${r.color_etiqueta_hex ? `<span class="swatch-color" style="background:${escaparHtml(r.color_etiqueta_hex)}"></span> ` : ''}${escaparHtml(r.color_etiqueta_nombre || '—')}</div>
                    <div><b>Carga:</b> ${r.hora_inicio_carga ? formatearHoraCorta(r.hora_inicio_carga) + ' – ' + formatearHoraCorta(r.hora_fin_carga) : '—'}</div>
                    <div><b>Sincronizado:</b> ${formatearFechaHora(r.sincronizado_at)}</div>
                    ${r.observaciones ? `<div class="span-2"><b>Observaciones:</b> ${escaparHtml(r.observaciones)}</div>` : ''}
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>#</th><th>Código QR</th><th>Estado</th><th>Escaneado</th></tr></thead>
                        <tbody>${filas || '<tr><td colspan="4">Sin fardos</td></tr>'}</tbody>
                    </table>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="reimprimirRemito(${r.id})">Reimprimir remito</button>
                    <button type="button" class="btn-secondary" onclick="document.getElementById('detalleRecepcion').innerHTML=''">Cerrar</button>
                </div>
            </div>
        `;
        destino.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error cargando recepción:', error);
        destino.innerHTML = `<div class="error-message">${escaparHtml(error.message)}</div>`;
    }
}
