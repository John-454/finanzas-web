//const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/facturas';
const API_URL = 'http://localhost:3000/api/facturas';

let facturas = [];
let facturaSeleccionada = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar estado de carga
  document.getElementById('estadoCarga').style.display = 'block';
  document.getElementById('estadoVacio').style.display = 'none';
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Error al cargar facturas');
    }
    
    facturas = await res.json();
    mostrarFacturas(facturas);
  } catch (err) {
    console.error('Error al cargar facturas:', err);
    // Mostrar estado vacío en caso de error
    document.getElementById('estadoCarga').style.display = 'none';
    document.getElementById('estadoVacio').style.display = 'block';
  }
});

function mostrarFacturas(lista) {
  const contenedor = document.getElementById('listaFacturas');
  const estadoCarga = document.getElementById('estadoCarga');
  const estadoVacio = document.getElementById('estadoVacio');
  
  // Ocultar estados de carga y vacío
  estadoCarga.style.display = 'none';
  estadoVacio.style.display = 'none';
  
  contenedor.innerHTML = '';

  if (lista.length === 0) {
    estadoVacio.style.display = 'block';
    return;
  }

  lista.forEach(f => {
    const saldo = f.total - (f.abono || 0);
    const porcentaje = Math.round(((f.abono || 0) / f.total) * 100);
    
    // Determinar estado de la factura
    let estado = 'pendiente';
    if (saldo === 0) {
      estado = 'pagado';
    } else {
      // Verificar si está vencida (más de 30 días)
      const fechaCreacion = new Date(f.createdAt);
      const hoy = new Date();
      const diasTranscurridos = (hoy - fechaCreacion) / (1000 * 60 * 60 * 24);
      if (diasTranscurridos > 30 && saldo > 0) {
        estado = 'vencido';
      }
    }
    
    const div = document.createElement('div');
    div.className = `factura-card ${estado}`;
    div.innerHTML = `
      <div class="factura-header">
        <div class="factura-numero">FAC-${f._id.slice(-6)}</div>
        <div class="factura-fecha">${new Date(f.createdAt).toLocaleDateString()}</div>
      </div>
      
      <div class="cliente-info">
        <div class="cliente-nombre">${f.cliente}</div>
      </div>
      
      <div class="info-financiera">
        <div class="info-item">
          <span class="info-label">Total</span>
          <span class="info-valor total">$${f.total.toLocaleString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Abonado</span>
          <span class="info-valor abonado">$${(f.abono || 0).toLocaleString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Saldo</span>
          <span class="info-valor saldo ${saldo === 0 ? 'cero' : ''}">$${saldo.toLocaleString()}</span>
        </div>
      </div>
      
      <div class="progreso-container">
        <div class="progreso-label">
          <span>Progreso de pago</span>
          <span>${porcentaje}%</span>
        </div>
        <div class="progreso-barra">
          <div class="progreso-fill" style="width: ${porcentaje}%"></div>
        </div>
      </div>
      
      <button class="btn-abonar" ${saldo === 0 ? 'disabled' : ''} onclick="abrirAbono('${f._id}')">
        ${saldo === 0 ? 'Pagado Completo' : 'Registrar Abono'}
      </button>
    `;
    contenedor.appendChild(div);
  });
}

function buscarCliente() {
  const termino = document.getElementById('busqueda').value.toLowerCase();
  const filtradas = facturas.filter(f => f.cliente.toLowerCase().includes(termino));
  mostrarFacturas(filtradas);
}

function abrirAbono(facturaId) {
  facturaSeleccionada = facturas.find(f => f._id === facturaId);
  if (!facturaSeleccionada) return alert('Factura no encontrada');

  document.getElementById('modalCliente').textContent = facturaSeleccionada.cliente;
  document.getElementById('modalTotal').textContent = facturaSeleccionada.total.toLocaleString();
  document.getElementById('modalAbonado').textContent = (facturaSeleccionada.abono || 0).toLocaleString();
  document.getElementById('modalSaldo').textContent = (facturaSeleccionada.total - (facturaSeleccionada.abono || 0)).toLocaleString();
  document.getElementById('nuevoAbono').value = '';

  document.getElementById('modalAbono').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('modalAbono').style.display = 'none';
}

function registrarAbono() {
  const monto = Number(document.getElementById('nuevoAbono').value);
  const tipo = document.getElementById('nuevoTipoAbono').value;

  if (!monto || isNaN(monto) || monto <= 0) {
    alert('Ingrese un monto válido.');
    return;
  }
  if (!tipo) {
    alert('Debe seleccionar un tipo de abono.');
    return;
  }

  const saldoPendiente = facturaSeleccionada.total - (facturaSeleccionada.abono || 0);
  if (monto > saldoPendiente) {
    alert(`El monto no puede ser mayor al saldo pendiente ($${saldoPendiente.toLocaleString()})`);
    return;
  }

  const token = localStorage.getItem('token');
  const botonGuardar = document.getElementById('guardarBtn');
  const textoOriginal = botonGuardar.textContent;
  botonGuardar.disabled = true;
  botonGuardar.textContent = 'Guardando...';

  fetch(`${API_URL}/${facturaSeleccionada._id}/abono`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ abono: monto, tipo })
  })
    .then(res => {
      if (!res.ok) throw new Error('Error al registrar el abono');
      return res.json(); // ✅ CAMBIO: Ahora esperamos JSON en lugar de text()
    })
    .then(data => {
      // ✅ CAMBIO: Mostramos el mensaje de éxito del backend
      alert(data.mensaje || 'Abono registrado correctamente');
      cerrarModal();
      // Recargar las facturas
      return fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
    })
    .then(res => res.json())
    .then(data => {
      facturas = data;
      mostrarFacturas(facturas);
    })
    .catch(err => {
      console.error('Error al registrar abono:', err);
      alert('Error al registrar el abono');
    })
    .finally(() => {
      botonGuardar.disabled = false;
      botonGuardar.textContent = textoOriginal;
    });
}


// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
  const modal = document.getElementById('modalAbono');
  if (event.target === modal) {
    cerrarModal();
  }
}