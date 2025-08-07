const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/productos';

document.addEventListener('DOMContentLoaded', cargarProductos);

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
    li.textContent = `${p.nombre} - $${p.precioUnitario}`;
    lista.appendChild(li);
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
