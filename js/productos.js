const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/productos';

document.addEventListener('DOMContentLoaded', cargarProductos);

let productoEditando = null;


async function cargarProductos() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    mostrarProductos(data);
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }
}

function mostrarProductos(productos) {
  const lista = document.getElementById('listaProductos');
  lista.innerHTML = '';

  productos.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${p.nombre} - $${p.precioUnitario}</span>
      <div class="acciones">
        <button onclick='abrirModalEditar(${JSON.stringify(p)})'>✏️</button>
        <button onclick="eliminarProducto('${p._id}')">🗑️</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

function editarProducto(id, nombreActual, precioActual) {
  const nuevoNombre = prompt("Editar nombre del producto:", nombreActual);
  if (!nuevoNombre) return;

  const nuevoPrecio = parseFloat(prompt("Editar precio unitario:", precioActual));
  if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
    alert("Precio inválido.");
    return;
  }

  fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nuevoNombre, precioUnitario: nuevoPrecio })
  })
    .then(res => {
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    })
    .then(() => {
      alert("Producto actualizado correctamente");
      cargarProductos();
    })
    .catch(err => {
      console.error("Error al actualizar producto:", err);
      alert("Error al actualizar el producto");
    });
}

function eliminarProducto(id) {
  if (!confirm("¿Estás seguro de eliminar este producto?")) return;

  fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) throw new Error("Error al eliminar");
      alert("Producto eliminado");
      cargarProductos();
    })
    .catch(err => {
      console.error("Error al eliminar producto:", err);
      alert("Error al eliminar el producto");
    });
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

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precioUnitario: precio })
    });

    if (!res.ok) throw new Error('Error al guardar');

    alert('Producto agregado correctamente');
    cerrarModal();
    cargarProductos(); // recargar lista
  } catch (error) {
    console.error('Error al guardar producto:', error);
    alert('Hubo un problema al guardar el producto');
  }
}

function abrirModalEditar(producto) {
  productoEditando = producto;
  document.getElementById('editarNombre').value = producto.nombre;
  document.getElementById('editarPrecio').value = producto.precioUnitario;
  document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
  productoEditando = null;
}

function guardarCambiosProducto() {
  const nuevoNombre = document.getElementById('editarNombre').value.trim();
  const nuevoPrecio = parseFloat(document.getElementById('editarPrecio').value);

  if (!nuevoNombre || isNaN(nuevoPrecio)) {
    alert('Por favor, completa todos los campos');
    return;
  }

  fetch(`${API_URL}/${productoEditando._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nuevoNombre, precioUnitario: nuevoPrecio })
  })
    .then(res => res.json())
    .then(data => {
      alert('Producto actualizado correctamente');
      cerrarModalEditar();
      cargarProductos();
    })
    .catch(err => {
      console.error('Error al actualizar producto:', err);
      alert('Error al actualizar el producto');
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
