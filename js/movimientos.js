// Configuración de la API
const API_ROOT = 'http://localhost:3000';
const API_MOVIMIENTOS = `${API_ROOT}/api/movimientos`;

let datosActuales = null;
let movimientosDetalle = [];

// Función para obtener token
function obtenerToken() {
  return localStorage.getItem('token');
}

// Función para obtener headers
function obtenerHeaders() {
  const token = obtenerToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Inicializar
window.onload = () => {
  mostrarHoy();
};

// Mostrar fecha de hoy
function mostrarHoy() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const localDate = `${y}-${m}-${d}`;
  
  document.getElementById('fechaSeleccionada').value = localDate;
  cargarDatos();
}

// Cargar datos de la fecha seleccionada
async function cargarDatos() {
  const fecha = document.getElementById('fechaSeleccionada').value;
  
  if (!fecha) {
    mostrarError('Por favor selecciona una fecha');
    return;
  }

  mostrarLoading(true);
  ocultarTodo();

  try {
    // Cargar resumen
    const resumenRes = await fetch(`${API_MOVIMIENTOS}/resumen/${fecha}`, {
      headers: obtenerHeaders()
    });

    if (!resumenRes.ok) {
      throw new Error('Error al cargar resumen');
    }

    datosActuales = await resumenRes.json();

    // Cargar detalle
    const detalleRes = await fetch(`${API_MOVIMIENTOS}/detalle/${fecha}`, {
      headers: obtenerHeaders()
    });

    if (detalleRes.ok) {
      const detalleData = await detalleRes.json();
      movimientosDetalle = detalleData.movimientos || [];
    }

    mostrarLoading(false);

    // Verificar si hay datos
    if (movimientosDetalle.length === 0) {
      mostrarEmptyState();
      return;
    }

    mostrarResumen(datosActuales);
    mostrarTablas();

  } catch (error) {
    mostrarLoading(false);
    mostrarError('Error al cargar los datos: ' + error.message);
  }
}

// Mostrar resumen en tarjetas
function mostrarResumen(datos) {
  const resumenCards = document.getElementById('resumenCards');
  resumenCards.classList.remove('oculto');

  // Total General
  const totalAbonos = datos.abonos.total;
  const totalGastos = datos.gastos.total;
  const saldoTotal = datos.saldos.total;

  document.getElementById('saldoTotal').textContent = formatearPeso(saldoTotal);
  document.getElementById('totalAbonos').textContent = formatearPeso(totalAbonos);
  document.getElementById('totalGastos').textContent = formatearPeso(totalGastos);

  // Aplicar clase según saldo
  const saldoTotalEl = document.getElementById('saldoTotal');
  saldoTotalEl.className = 'saldo-principal';
  if (saldoTotal > 0) {
    saldoTotalEl.classList.add('positivo');
  } else if (saldoTotal < 0) {
    saldoTotalEl.classList.add('negativo');
  }

  // Efectivo
  document.getElementById('saldoEfectivo').textContent = formatearPeso(datos.saldos.efectivo);
  document.getElementById('abonosEfectivo').textContent = formatearPeso(datos.abonos.efectivo);
  document.getElementById('gastosEfectivo').textContent = formatearPeso(datos.gastos.efectivo);

  const saldoEfectivoEl = document.getElementById('saldoEfectivo');
  saldoEfectivoEl.className = 'saldo-principal';
  if (datos.saldos.efectivo > 0) {
    saldoEfectivoEl.classList.add('positivo');
  } else if (datos.saldos.efectivo < 0) {
    saldoEfectivoEl.classList.add('negativo');
  }

  // Nequi
  document.getElementById('saldoNequi').textContent = formatearPeso(datos.saldos.nequi);
  document.getElementById('abonosNequi').textContent = formatearPeso(datos.abonos.nequi);
  document.getElementById('gastosNequi').textContent = formatearPeso(datos.gastos.nequi);

  const saldoNequiEl = document.getElementById('saldoNequi');
  saldoNequiEl.className = 'saldo-principal';
  if (datos.saldos.nequi > 0) {
    saldoNequiEl.classList.add('positivo');
  } else if (datos.saldos.nequi < 0) {
    saldoNequiEl.classList.add('negativo');
  }
}

// Mostrar todas las tablas
function mostrarTablas() {
  document.getElementById('tabsContainer').classList.remove('oculto');
  
  mostrarTablaResumen();
  mostrarTablaAbonos();
  mostrarTablaGastos();
  mostrarTablaDetalle();
}

// Tabla Resumen
function mostrarTablaResumen() {
  const tbody = document.getElementById('tablaResumen');
  const datos = datosActuales;
  
  tbody.innerHTML = `
    <tr>
      <td class="tipo-cell abono">Abonos</td>
      <td class="monto-positivo">${formatearPeso(datos.abonos.efectivo)}</td>
      <td class="monto-positivo">${formatearPeso(datos.abonos.nequi)}</td>
      <td class="monto-positivo total">${formatearPeso(datos.abonos.total)}</td>
    </tr>
    <tr>
      <td class="tipo-cell gasto">Gastos</td>
      <td class="monto-negativo">${formatearPeso(datos.gastos.efectivo)}</td>
      <td class="monto-negativo">${formatearPeso(datos.gastos.nequi)}</td>
      <td class="monto-negativo total">${formatearPeso(datos.gastos.total)}</td>
    </tr>
    <tr class="fila-total">
      <td class="tipo-cell">Saldo Neto</td>
      <td class="${datos.saldos.efectivo >= 0 ? 'monto-positivo' : 'monto-negativo'}">${formatearPeso(datos.saldos.efectivo)}</td>
      <td class="${datos.saldos.nequi >= 0 ? 'monto-positivo' : 'monto-negativo'}">${formatearPeso(datos.saldos.nequi)}</td>
      <td class="${datos.saldos.total >= 0 ? 'monto-positivo' : 'monto-negativo'} total">${formatearPeso(datos.saldos.total)}</td>
    </tr>
  `;
}

// Tabla Abonos
function mostrarTablaAbonos() {
  const tbody = document.getElementById('tablaAbonos');
  const abonos = movimientosDetalle.filter(m => m.tipo === 'abono');
  
  if (abonos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="sin-datos">No hay abonos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = abonos.map(abono => `
    <tr>
      <td>${formatearHora(abono.fecha)}</td>
      <td>${abono.cliente || 'N/A'}</td>
      <td>
        <span class="badge ${abono.metodoPago}">
          ${abono.metodoPago === 'efectivo' ? '💵 Efectivo' : '📱 Nequi'}
        </span>
      </td>
      <td class="monto-positivo">${formatearPeso(abono.monto)}</td>
    </tr>
  `).join('');
}

// Tabla Gastos
function mostrarTablaGastos() {
  const tbody = document.getElementById('tablaGastos');
  const gastos = movimientosDetalle.filter(m => m.tipo === 'gasto');
  
  if (gastos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="sin-datos">No hay gastos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = gastos.map(gasto => `
    <tr>
      <td>${formatearHora(gasto.fecha)}</td>
      <td>${gasto.descripcion}</td>
      <td>
        <span class="badge ${gasto.metodoPago}">
          ${gasto.metodoPago === 'efectivo' ? '💵 Efectivo' : '📱 Nequi'}
        </span>
      </td>
      <td class="monto-negativo">${formatearPeso(gasto.monto)}</td>
    </tr>
  `).join('');
}

// Tabla Detalle Completo
function mostrarTablaDetalle() {
  const tbody = document.getElementById('tablaDetalle');
  
  if (movimientosDetalle.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="sin-datos">No hay movimientos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = movimientosDetalle.map(mov => `
    <tr>
      <td>${formatearHora(mov.fecha)}</td>
      <td>
        <span class="badge-tipo ${mov.tipo}">
          ${mov.tipo === 'abono' ? '💰 Abono' : '💸 Gasto'}
        </span>
      </td>
      <td>${mov.tipo === 'abono' ? (mov.cliente || 'N/A') : mov.descripcion}</td>
      <td>
        <span class="badge ${mov.metodoPago}">
          ${mov.metodoPago === 'efectivo' ? '💵 Efectivo' : '📱 Nequi'}
        </span>
      </td>
      <td class="${mov.tipo === 'abono' ? 'monto-positivo' : 'monto-negativo'}">
        ${mov.tipo === 'abono' ? '+' : '-'}${formatearPeso(mov.monto)}
      </td>
    </tr>
  `).join('');
}

// Cambiar tab
function cambiarTab(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar tab seleccionado
  document.getElementById(`${tabName}-tab`).classList.add('active');
  event.target.classList.add('active');
}

// Utilidades
function formatearPeso(cantidad) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(Math.abs(cantidad));
}

function formatearHora(fecha) {
  const date = new Date(fecha);
  return date.toLocaleTimeString('es-CO', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function mostrarLoading(mostrar) {
  document.getElementById('loading').classList.toggle('oculto', !mostrar);
}

function mostrarError(mensaje) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = mensaje;
  errorDiv.classList.remove('oculto');
  setTimeout(() => errorDiv.classList.add('oculto'), 5000);
}

function mostrarEmptyState() {
  document.getElementById('emptyState').classList.remove('oculto');
}

function ocultarTodo() {
  document.getElementById('emptyState').classList.add('oculto');
  document.getElementById('error').classList.add('oculto');
  document.getElementById('resumenCards').classList.add('oculto');
  document.getElementById('tabsContainer').classList.add('oculto');
}