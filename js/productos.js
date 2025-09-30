//const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/productos';
const API_URL = 'http://localhost:3000/api/productos';

document.addEventListener('DOMContentLoaded', cargarProductos);

let productoEditando = null;

async function cargarProductos() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    
    const data = await res.json();
    mostrarProductos(data);
  } catch (error) {
    console.error('Error al cargar productos:', error);
    alert('Error al cargar productos. Verifica la conexión con el servidor.');
  }
}

function mostrarProductos(productos) {
  const lista = document.getElementById('listaProductos');
  lista.innerHTML = '';

  productos.forEach(p => {
    const li = document.createElement('li');
    li.className = 'producto-item';
    const precio = Number(p.precioUnitario) || 0;
    li.innerHTML = `
      <div class="producto-info">
        <div class="producto-nombre">${p.nombre}</div>
        <div class="precio-label">Precio</div>
        <div class="producto-precio">${precio.toFixed(2)}</div>
      </div>
      <div class="producto-acciones">
        <button class="btn-editar" onclick='abrirModalEditar(${JSON.stringify(p)})'>✏️ Editar</button>
        <button class="btn-eliminar" onclick="eliminarProducto('${p._id}')">🗑️ Eliminar</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

// Función mejorada para eliminar producto
async function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de eliminar este producto?")) return;

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Error ${res.status}: ${errorData.message || 'Error al eliminar'}`);
    }

    alert("Producto eliminado correctamente");
    await cargarProductos(); // Recargar la lista
    
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    alert(`Error al eliminar el producto: ${error.message}`);
  }
}

function abrirModal() {
  document.getElementById('modal').classList.remove('oculto');
}

function cerrarModal() {
  document.getElementById('modal').classList.add('oculto');
  document.getElementById('nombreProducto').value = '';
  document.getElementById('precioProducto').value = '';
}

async function guardarProducto() {
  const nombre = document.getElementById('nombreProducto').value.trim();
  const precio = parseFloat(document.getElementById('precioProducto').value);

  if (!nombre || isNaN(precio) || precio <= 0) {
    alert('Por favor ingrese un nombre válido y un precio mayor a 0.');
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, precioUnitario: precio })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Error ${res.status}: ${errorData.message || 'Error al guardar'}`);
    }

    alert('Producto agregado correctamente');
    cerrarModal();
    await cargarProductos();
    
  } catch (error) {
    console.error('Error al guardar producto:', error);
    alert(`Hubo un problema al guardar el producto: ${error.message}`);
  }
}

function abrirModalEditar(producto) {
  productoEditando = producto;
  document.getElementById('editarNombre').value = producto.nombre;
  document.getElementById('editarPrecio').value = producto.precioUnitario;
  document.getElementById('modalEditar').classList.remove('oculto');
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').classList.add('oculto');
  productoEditando = null;
}

// Función mejorada para guardar cambios del producto
async function guardarCambiosProducto() {
  const nuevoNombre = document.getElementById('editarNombre').value.trim();
  const nuevoPrecio = parseFloat(document.getElementById('editarPrecio').value);

  if (!nuevoNombre || isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    alert('Por favor, completa todos los campos correctamente');
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/${productoEditando._id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre: nuevoNombre, precioUnitario: nuevoPrecio })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Error ${res.status}: ${errorData.message || 'Error al actualizar'}`);
    }

    alert('Producto actualizado correctamente');
    cerrarModalEditar();
    await cargarProductos();
    
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    alert(`Error al actualizar el producto: ${error.message}`);
  }
}

// Función legacy - se mantiene por compatibilidad pero se recomienda usar guardarCambiosProducto
function editarProducto(id, nombreActual, precioActual) {
  const nuevoNombre = prompt("Editar nombre del producto:", nombreActual);
  if (!nuevoNombre) return;

  const nuevoPrecio = parseFloat(prompt("Editar precio unitario:", precioActual));
  if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    alert("Precio inválido.");
    return;
  }

  const token = localStorage.getItem('token');

  fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ nombre: nuevoNombre, precioUnitario: nuevoPrecio })
  })
    .then(async res => {
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Error ${res.status}: ${errorData.message || 'Error al actualizar'}`);
      }
      return res.json();
    })
    .then(() => {
      alert("Producto actualizado correctamente");
      cargarProductos();
    })
    .catch(err => {
      console.error("Error al actualizar producto:", err);
      alert(`Error al actualizar el producto: ${err.message}`);
    });
}

function filtrarProductos() {
  const termino = document.getElementById('busquedaProducto').value.toLowerCase();
  const lista = document.getElementById('listaProductos');
  const items = lista.getElementsByTagName('li');

  Array.from(items).forEach(item => {
    const texto = item.textContent.toLowerCase();
    item.style.display = texto.includes(termino) ? '' : 'none';
  });
}