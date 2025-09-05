const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
const API_EMPRESA = `${API_ROOT}/api/empresa`;
const API_ORIGIN = API_ROOT;

let empresaActual = null;
let modoEdicion = false;

// Elementos del DOM
const loading = document.getElementById('loading');
const empresaCard = document.getElementById('empresaCard');
const noEmpresaCard = document.getElementById('noEmpresaCard');
const crearEmpresaCard = document.getElementById('crearEmpresaCard');
const empresaForm = document.getElementById('empresaForm');
const crearEmpresaForm = document.getElementById('crearEmpresaForm');

// Cargar empresa al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacion();
    cargarEmpresa();
});

// Verificar si el usuario está autenticado
function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Cargar empresa del usuario
async function cargarEmpresa() {
    try {
        mostrarLoading(true);
        
        const token = localStorage.getItem('token');
        const response = await fetch(API_EMPRESA, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 404) {
            // No tiene empresa
            mostrarNoEmpresa();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }

        const empresa = await response.json();
        empresaActual = empresa;
        mostrarEmpresa(empresa);

    } catch (error) {
        console.error('Error al cargar empresa:', error);
        mostrarToast('Error al cargar la empresa', 'error');
        mostrarNoEmpresa();
    } finally {
        mostrarLoading(false);
    }
}

// Mostrar/ocultar loading
function mostrarLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    empresaCard.style.display = show ? 'none' : empresaCard.style.display;
    noEmpresaCard.style.display = show ? 'none' : noEmpresaCard.style.display;
    crearEmpresaCard.style.display = show ? 'none' : crearEmpresaCard.style.display;
}

// Mostrar empresa existente
function mostrarEmpresa(empresa) {
    empresaCard.style.display = 'block';
    noEmpresaCard.style.display = 'none';
    crearEmpresaCard.style.display = 'none';

    // Llenar formulario
    document.getElementById('nombre').value = empresa.nombre;
    document.getElementById('direccion').value = empresa.direccion;
    document.getElementById('ciudad').value = empresa.ciudad;
    document.getElementById('contacto').value = empresa.contacto;

    // Mostrar logo
    mostrarLogo(empresa.logo);

    // Configurar modo vista
    configurarModoVista();
}

// Mostrar estado sin empresa
function mostrarNoEmpresa() {
    empresaCard.style.display = 'none';
    noEmpresaCard.style.display = 'block';
    crearEmpresaCard.style.display = 'none';
    // Muestra el botón para crear empresa
    document.getElementById('btnCrearEmpresa').style.display = 'block';
}

// Mostrar formulario de creación
function crearNuevaEmpresa() {
    empresaCard.style.display = 'none';
    noEmpresaCard.style.display = 'none';
    crearEmpresaCard.style.display = 'block';

    // Limpiar formulario
    document.getElementById('crearEmpresaForm').reset();
    limpiarPreviewLogo('logoPreviewNuevo');
}

// Configurar modo vista (campos deshabilitados)
function configurarModoVista() {
    const campos = ['nombre', 'direccion', 'ciudad', 'contacto'];
    campos.forEach(campo => {
        document.getElementById(campo).disabled = true;
    });

    const btnEditar = document.getElementById('btnEditar');
    if (btnEditar) btnEditar.style.display = 'block';

    const btnEliminar = document.getElementById('btnEliminar');
    if (btnEliminar) btnEliminar.style.display = 'none';

    const formActions = document.getElementById('formActions');
    if (formActions) formActions.style.display = 'none';

    const logoActions = document.getElementById('logoActions');
    if (logoActions) logoActions.style.display = 'none';

    const titleText = document.getElementById('titleText');
    if (titleText) titleText.textContent = 'Mi Empresa';

    modoEdicion = false;
}

// Configurar modo edición (campos habilitados)
function configurarModoEdicion() {
    const campos = ['nombre', 'direccion', 'ciudad', 'contacto'];
    campos.forEach(campo => {
        document.getElementById(campo).disabled = false;
    });

    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnEliminar').style.display = 'block';
    document.getElementById('formActions').style.display = 'flex';
    document.getElementById('logoActions').style.display = 'flex';
    document.getElementById('titleText').textContent = 'Editando Empresa';

    modoEdicion = true;
}

// Toggle entre modo vista y edición
function toggleEditMode() {
    if (modoEdicion) {
        configurarModoVista();
    } else {
        configurarModoEdicion();
    }
}

// Cancelar edición
function cancelarEdicion() {
    if (empresaActual) {
        mostrarEmpresa(empresaActual); // Restaurar datos originales
    }
}

// Cancelar creación
function cancelarCreacion() {
    if (empresaActual) {
        mostrarEmpresa(empresaActual);
    } else {
        mostrarNoEmpresa();
    }
}

// Mostrar logo en preview
function mostrarLogo(logoUrl) {
    const logoPreview = document.getElementById('logoPreview');
    
    if (logoUrl) {
        const src = logoUrl.startsWith('/') ? `${API_ORIGIN}${logoUrl}` : logoUrl;
        logoPreview.innerHTML = `<img src="${src}" alt="Logo de la empresa">`;
    } else {
        logoPreview.innerHTML = `
            <i class="fas fa-building logo-placeholder"></i>
            <span class="logo-text">Sin Logo</span>
        `;
    }
}

// Preview de logo al seleccionar archivo
function previewLogo(input) {
    const file = input.files[0];
    const logoPreview = document.getElementById('logoPreview');
    
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
            mostrarToast('El archivo es demasiado grande. Máximo 5MB', 'error');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            logoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview del logo">`;
        };
        reader.readAsDataURL(file);
    } else {
        mostrarLogo(empresaActual?.logo);
    }
}

// Preview de logo para formulario de creación
function previewLogoNuevo(input) {
    const file = input.files[0];
    const logoPreview = document.getElementById('logoPreviewNuevo');
    
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
            mostrarToast('El archivo es demasiado grande. Máximo 5MB', 'error');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            logoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview del logo">`;
        };
        reader.readAsDataURL(file);
    } else {
        limpiarPreviewLogo('logoPreviewNuevo');
    }
}

// Limpiar preview de logo
function limpiarPreviewLogo(elementId) {
    const logoPreview = document.getElementById(elementId);
    logoPreview.innerHTML = `
        <i class="fas fa-building logo-placeholder"></i>
        <span class="logo-text">Sin Logo</span>
    `;
}

// Eliminar solo el logo
async function eliminarLogo() {
    if (!empresaActual?.logo) {
        mostrarToast('No hay logo para eliminar', 'warning');
        return;
    }

    mostrarConfirmacion(
        'Eliminar Logo',
        '¿Estás seguro de que quieres eliminar el logo de la empresa?',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_EMPRESA}/logo`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al eliminar el logo');
                }

                const data = await response.json();
                empresaActual = data.empresa;
                
                mostrarToast('Logo eliminado correctamente', 'success');
                mostrarLogo(null);
                
            } catch (error) {
                console.error('Error al eliminar logo:', error);
                mostrarToast(`Error al eliminar logo: ${error.message}`, 'error');
            }
        }
    );
}

// Manejar envío del formulario de edición
empresaForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!modoEdicion) return;

    try {
        const formData = new FormData();
        
        // Agregar campos de texto
        formData.append('nombre', document.getElementById('nombre').value.trim());
        formData.append('direccion', document.getElementById('direccion').value.trim());
        formData.append('ciudad', document.getElementById('ciudad').value.trim());
        formData.append('contacto', document.getElementById('contacto').value.trim());
        
        // Agregar archivo de logo si se seleccionó uno
        const logoFile = document.getElementById('logoFile').files[0];
        if (logoFile) {
            formData.append('logo', logoFile);
        }

        const token = localStorage.getItem('token');
        const response = await fetch(API_EMPRESA, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar la empresa');
        }

        const empresaActualizada = await response.json();
        empresaActual = empresaActualizada;
        
        mostrarToast('Empresa actualizada correctamente', 'success');
        mostrarEmpresa(empresaActualizada);
        
    } catch (error) {
        console.error('Error al actualizar empresa:', error);
        mostrarToast(`Error al actualizar empresa: ${error.message}`, 'error');
    }
});

// Manejar envío del formulario de creación
crearEmpresaForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData();
        
        // Agregar campos de texto
        formData.append('nombre', document.getElementById('nombreNuevo').value.trim());
        formData.append('direccion', document.getElementById('direccionNuevo').value.trim());
        formData.append('ciudad', document.getElementById('ciudadNuevo').value.trim());
        formData.append('contacto', document.getElementById('contactoNuevo').value.trim());
        
        // Agregar archivo de logo si se seleccionó uno
        const logoFile = document.getElementById('logoFileNuevo').files[0];
        if (logoFile) {
            formData.append('logo', logoFile);
        }

        const token = localStorage.getItem('token');
        const response = await fetch(API_EMPRESA, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear la empresa');
        }

        const nuevaEmpresa = await response.json();
        empresaActual = nuevaEmpresa;
        
        mostrarToast('Empresa creada correctamente', 'success');
        mostrarEmpresa(nuevaEmpresa);
        
    } catch (error) {
        console.error('Error al crear empresa:', error);
        mostrarToast(`Error al crear empresa: ${error.message}`, 'error');
    }
});

// Eliminar empresa completa
function eliminarEmpresa() {
    mostrarConfirmacion(
        'Eliminar Empresa',
        '¿Estás seguro de que quieres eliminar completamente tu empresa? Esta acción no se puede deshacer.',
        async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_EMPRESA, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al eliminar la empresa');
                }

                empresaActual = null;
                mostrarToast('Empresa eliminada correctamente', 'success');
                mostrarNoEmpresa();
                
            } catch (error) {
                console.error('Error al eliminar empresa:', error);
                mostrarToast(`Error al eliminar empresa: ${error.message}`, 'error');
            }
        }
    );
}

// Mostrar toast de notificación
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = `toast ${tipo}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Mostrar modal de confirmación
function mostrarConfirmacion(titulo, mensaje, callback) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');

    modalTitle.textContent = titulo;
    modalMessage.textContent = mensaje;
    
    // Limpiar event listeners anteriores
    const newModalConfirm = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);
    
    // Agregar nuevo event listener
    newModalConfirm.addEventListener('click', () => {
        cerrarModal();
        callback();
    });

    modal.style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Cerrar modal al hacer click fuera de él
window.addEventListener('click', function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        cerrarModal();
    }
});

// Manejar tecla Escape para cerrar modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModal();
    }
});