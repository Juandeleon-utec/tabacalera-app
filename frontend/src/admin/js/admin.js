// Funciones para colores de etiqueta
async function cargarColoresEtiqueta() {
    try {
        const response = await fetch('/api/admin/colores-etiqueta?page=1&limit=20', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar colores');
        }
        
        const data = await response.json();
        mostrarColoresEtiqueta(data);
    } catch (error) {
        console.error('Error cargando colores:', error);
        document.getElementById('contenido-principal').innerHTML = 
            '<div class="error-message">Error al cargar colores de etiqueta</div>';
    }
}

function mostrarColoresEtiqueta(data) {
    const contenido = document.getElementById('contenido-principal');
    let html = `
        <h2>Gestión de Colores de Etiqueta</h2>
        <div class="form-container" id="formColorEtiquetaContainer">
            <h3 id="colorEtiquetaFormTitle">Agregar Nuevo Color</h3>
            <form id="formColorEtiqueta">
                <input type="hidden" id="colorEtiquetaId">
                <div class="form-group">
                    <label for="nombre">Nombre:</label>
                    <input type="text" id="nombre" required>
                </div>
                <div class="form-group">
                    <label for="hex">Código Hexadecimal:</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" id="colorPicker" style="width: 50px; height: 40px; padding: 0; border: none;">
                        <input type="text" id="hex" placeholder="#RRGGBB" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="guardarColorEtiqueta()" class="btn btn-primary">Guardar Color</button>
                    <button type="button" onclick="cancelarEdicionColorEtiqueta()" class="btn btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;"></th>
                        <th style="width: 150px;">Nombre</th>
                        <th>Hex</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.colores_etiqueta.forEach(color => {
        html += `
            <tr>
                <td><div style="width: 24px; height: 24px; border: 1px solid #555; background-color: ${color.hex};"></div></td>
                <td>${color.nombre}</td>
                <td><code>${color.hex}</code></td>
                <td>${color.activo ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="editarColorEtiqueta(${color.id})">Editar</button>
                    <button class="action-btn btn-delete" onclick="eliminarColorEtiqueta(${color.id})">Eliminar</button>
                    <button class="action-btn btn-toggle" onclick="toggleColorEtiquetaStatus(${color.id})">${color.activo ? 'Desactivar' : 'Activar'}</button>
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

    // Sincronizar color picker con input hex
    const picker = document.getElementById('colorPicker');
    const hexInput = document.getElementById('hex');
    
    if (picker && hexInput) {
        picker.addEventListener('input', (e) => {
            hexInput.value = e.target.value.toUpperCase();
        });
        hexInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (val && !val.startsWith('#')) {
                val = '#' + val;
            }
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                picker.value = val;
            }
        });
    }
}

async function guardarColorEtiqueta() {
    const id = document.getElementById('colorEtiquetaId').value;
    const nombre = document.getElementById('nombre').value;
    let hex = document.getElementById('hex').value;
    
    if (hex && !hex.startsWith('#')) {
        hex = '#' + hex;
    }
    hex = hex.toUpperCase();

    try {
        let response;
        let url;
        
        if (id) {
            url = `/api/admin/colores-etiqueta/${id}`;
            response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, hex })
            });
        } else {
            url = '/api/admin/colores-etiqueta';
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, hex })
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Color guardado correctamente');
            cargarColoresEtiqueta();
        } else {
            alert('Error: ' + (data.error || 'No se pudo guardar el color'));
        }
    } catch (error) {
        console.error('Error guardando color:', error);
        alert('Error de conexión');
    }
}

async function editarColorEtiqueta(id) {
    try {
        const response = await fetch(`/api/admin/colores-etiqueta/${id}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Error al cargar color');
        
        const data = await response.json();
        const color = data.color;
        
        document.getElementById('colorEtiquetaId').value = color.id;
        document.getElementById('nombre').value = color.nombre;
        document.getElementById('hex').value = color.hex;
        document.getElementById('colorPicker').value = color.hex;
        document.getElementById('colorEtiquetaFormTitle').textContent = 'Editar Color';
        
        document.getElementById('formColorEtiquetaContainer').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
    } catch (error) {
        console.error('Error cargando color:', error);
        alert('Error al cargar color para edición');
    }
}

function cancelarEdicionColorEtiqueta() {
    document.getElementById('colorEtiquetaId').value = '';
    document.getElementById('nombre').value = '';
    document.getElementById('hex').value = '';
    document.getElementById('colorEtiquetaFormTitle').textContent = 'Agregar Nuevo Color';
    
    document.getElementById('formColorEtiquetaContainer').style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';
}

async function eliminarColorEtiqueta(id) {
    if (!confirm('¿Está seguro de que desea eliminar este color?')) return;
    
    try {
        const response = await fetch(`/api/admin/colores-etiqueta/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Color eliminado correctamente');
            cargarColoresEtiqueta();
        } else {
            alert('Error: ' + (data.error || 'No se pudo eliminar el color'));
        }
    } catch (error) {
        console.error('Error eliminando color:', error);
        alert('Error de conexión');
    }
}

async function toggleColorEtiquetaStatus(id) {
    try {
        const response = await fetch(`/api/admin/colores-etiqueta/${id}/toggle`, {
            method: 'PATCH',
            credentials: 'include'
        });
        
        if (response.ok) {
            cargarColoresEtiqueta();
        } else {
            const data = await response.json();
            alert('Error: ' + (data.error || 'No se pudo cambiar el estado'));
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        alert('Error de conexión');
    }
}
