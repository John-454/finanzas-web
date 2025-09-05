// Configuración de la API
const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
const API_CONTABILIDAD = `${API_ROOT}/api/contabilidad`;
const API_FACTURAS = `${API_ROOT}/api/facturas`;
let resumenActual = null;
    let gastosActuales = [];
    let facturasActuales = [];

    // Agregar al inicio del archivo, después de las constantes
function obtenerToken() {
  return localStorage.getItem('token'); // o sessionStorage.getItem('token')
}

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

    // Inicializar la aplicación
    window.onload = () => {
      mostrarHoy();
    };

    function mostrarHoy() {
      // Usar fecha en hora local, no UTC, para evitar desfaces de día
      const now = new Date();
      const tzoffset = now.getTimezoneOffset() * 60000; // minutos -> ms
      const localISODate = new Date(now - tzoffset).toISOString().split('T')[0];
      document.getElementById('fechaSeleccionada').value = localISODate;
      cargarResumenDia();
    }

    function cambiarTab(tab, evt) {
  // Ocultar todos los tabs
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  // Mostrar tab seleccionado
  document.getElementById(tab + '-tab').classList.add('active');

  // Activar botón seleccionado sin depender de 'event' global
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  } else {
    const btn = document.querySelector(`.tabs .tab[onclick*="${tab}"]`);
    if (btn) btn.classList.add('active');
  }

  // Si es el tab de gráficos, generar gráficos
  if (tab === 'graficos' && resumenActual) {
    setTimeout(generarGraficos, 100);
  }
}

    async function cargarResumenDia() {
  const fecha = document.getElementById('fechaSeleccionada').value;
  
  if (!fecha) {
    mostrarError('Por favor selecciona una fecha');
    return;
  }

  mostrarLoading(true);
  
  try {
    // Cargar resumen diario
    const resumenRes = await fetch(`${API_CONTABILIDAD}/resumen-diario/${fecha}`, {
      headers: obtenerHeaders()
    });
    if (!resumenRes.ok) throw new Error('Error al cargar resumen');
    
    resumenActual = await resumenRes.json();
    mostrarResumen(resumenActual);

    // Cargar gastos del día
    const gastosRes = await fetch(`${API_CONTABILIDAD}/gastos/${fecha}`, {
      headers: obtenerHeaders()
    });
    if (gastosRes.ok) {
      const gastosData = await gastosRes.json();
      gastosActuales = gastosData.gastos || [];
      mostrarGastos(gastosActuales);
    }

   // Cargar facturas del día
    let lista = [];
    try {
      const facturasRes = await fetch(`${API_FACTURAS}/fecha/${fecha}`, {
        headers: obtenerHeaders()
      });
      if (facturasRes.ok) {
        const facturasData = await facturasRes.json();
        lista = Array.isArray(facturasData)
          ? facturasData
          : (facturasData.facturas || facturasData.data || []);
      } else {
        console.warn('Endpoint facturas/fecha no disponible. HTTP', facturasRes.status, facturasRes.statusText);
      }
    } catch (e) {
      console.warn('Error consultando facturas por fecha:', e);
    }

    if (!Array.isArray(lista) || lista.length === 0) {
      console.warn('Usando fallback: cargando todas las facturas y filtrando por fecha');
      await cargarFacturasPorFechaFallback(fecha);
    } else {
      facturasActuales = lista;
      console.log('Facturas cargadas (endpoint fecha):', facturasActuales.length);
      mostrarFacturas(facturasActuales);
    }

    mostrarLoading(false);
    
  } catch (error) {
    mostrarError('Error al cargar los datos: ' + error.message);
    mostrarLoading(false);
  }
}

    // Nueva función para mostrar facturas del día
function mostrarFacturas(facturas) {
  const lista = document.getElementById('lista-facturas');
  
  if (!lista) {
    console.error('Elemento lista-facturas no encontrado');
    return;
  }
  
  if (facturas.length === 0) {
    lista.innerHTML = '<div class="loading">No hay facturas registradas para esta fecha</div>';
    return;
  }

  lista.innerHTML = facturas.map(factura => {
    const total = Number(factura.total) || 0;
    const abono = Number(factura.abono) || 0;
    const saldo = factura.saldo != null ? Number(factura.saldo) : Math.max(total - abono, 0);
    const porcentajeCobrado = total > 0 ? (abono / total) * 100 : 0;
    const estadoPago = saldo === 0 ? 'PAGADA' : 'PENDIENTE';
    const colorEstado = saldo === 0 ? '#10b981' : '#f59e0b';
    
    return `
      <div class="factura-item" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: white;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="flex-grow: 1;">
            <h4 style="margin: 0; color: #1f2937;">👤 ${factura.cliente}</h4>
            <small style="color: #6b7280;">
              ${new Date(factura.fecha || factura.createdAt).toLocaleString()} | 
              ${factura.productos?.length || 0} producto(s)
            </small>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 1.1em; color: #1f2937;">
              ${formatearPeso(total)}
            </div>
            <div style="color: ${colorEstado}; font-size: 0.9em; font-weight: bold;">
              ${estadoPago}
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
          <div>
            <small style="color: #6b7280;">💰 Abonado:</small>
            <div style="font-weight: bold; color: #10b981;">
              ${formatearPeso(abono)}
            </div>
          </div>
          <div>
            <small style="color: #6b7280;">⏳ Saldo:</small>
            <div style="font-weight: bold; color: ${saldo > 0 ? '#f59e0b' : '#10b981'};">
              ${formatearPeso(saldo)}
            </div>
          </div>
        </div>

        ${saldo > 0 ? `
          <div style="background: #fef3c7; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
            <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 6px;">
              <div style="width: ${porcentajeCobrado}%; background: #10b981; height: 100%; border-radius: 4px;"></div>
            </div>
            <small style="color: #92400e;">
              Progreso de pago: ${porcentajeCobrado.toFixed(1)}%
            </small>
          </div>
        ` : ''}

        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; color: #3b82f6;">Ver productos</summary>
          <div style="margin-top: 10px; padding-left: 15px;">
            ${(factura.productos || []).map(p => `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6;">
                <span>${p.nombre} (x${p.cantidad})</span>
                <span>${formatearPeso(p.cantidad * p.precioUnitario)}</span>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;
  }).join('');
}

// Helpers para facturas por fecha (fallback)
function normalizarFechaLocal(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function esMismaFechaLocal(dateLike, yyyyMMdd) {
  const normalizada = normalizarFechaLocal(dateLike);
  return normalizada === yyyyMMdd;
}

async function cargarFacturasPorFechaFallback(fecha) {
  try {
    const res = await fetch(`${API_FACTURAS}`, {
      headers: obtenerHeaders()
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const todas = Array.isArray(data) ? data : (data.facturas || data.data || []);
    const filtradas = todas.filter(f => esMismaFechaLocal(f.fecha || f.createdAt, fecha));
    facturasActuales = filtradas;
    console.log('Facturas cargadas (fallback filtradas):', facturasActuales.length);
    mostrarFacturas(facturasActuales);
  } catch (e) {
    console.error('Error en fallback de facturas:', e);
    mostrarFacturas([]);
  }
}

    function mostrarResumen(resumen) {
      document.getElementById('totalVentas').textContent = formatearPeso(resumen.ventas.total);
      document.getElementById('cantidadFacturas').textContent = `${resumen.ventas.cantidadFacturas} facturas`;
      
      document.getElementById('totalGastos').textContent = formatearPeso(resumen.gastos.total);
      document.getElementById('cantidadGastos').textContent = `${resumen.gastos.cantidadGastos} gastos`;
      
      document.getElementById('saldoNeto').textContent = formatearPeso(resumen.saldos.saldoNeto);
      document.getElementById('totalAbonos').textContent = formatearPeso(resumen.ventas.totalAbonado);

      // Cambiar colores según el saldo
      const saldoCard = document.getElementById('saldoNeto').parentElement;
      const efectivoEl = document.getElementById('efectivoDisponible');
      
      const saldoNetoElement = document.getElementById('saldoNeto').parentElement;
const descripcionSaldo = saldoNetoElement.querySelector('small') || document.createElement('small');
descripcionSaldo.textContent = 'Abonos - Gastos'; // Cambiar de "Ventas - Gastos"
if (!saldoNetoElement.querySelector('small')) {
  saldoNetoElement.appendChild(descripcionSaldo);
}

      if (resumen.saldos.saldoNeto >= 0) {
        saldoCard.style.borderLeftColor = '#10b981';
      } else {
        saldoCard.style.borderLeftColor = '#ef4444';
      }

      if (efectivoEl) {
        const efectivoCard = efectivoEl.parentElement;
        if (resumen.saldos.efectivoDisponible >= 0) {
          efectivoCard.style.borderLeftColor = '#10b981';
        } else {
          efectivoCard.style.borderLeftColor = '#ef4444';
        }
      }
    }

    function mostrarGastos(gastos) {
      const lista = document.getElementById('lista-gastos');
      
      if (gastos.length === 0) {
        lista.innerHTML = '<div class="loading">No hay gastos registrados para esta fecha</div>';
        return;
      }

      lista.innerHTML = gastos.map(gasto => `
        <div class="gasto-item">
          <div class="gasto-info">
            <h4>${gasto.descripcion}</h4>
            <small>Categoría: ${gasto.categoria} | ${new Date(gasto.fecha).toLocaleTimeString()}</small>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="gasto-monto">${formatearPeso(gasto.monto)}</div>
            <button class="btn-danger" onclick="eliminarGasto('${gasto._id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    }

    async function agregarGasto(event) {
  event.preventDefault();
  
  const descripcion = document.getElementById('descripcionGasto').value;
  const monto = parseFloat(document.getElementById('montoGasto').value);
  const categoria = document.getElementById('categoriaGasto').value;
  const fechaInput = document.getElementById('fechaSeleccionada').value;

  console.log('Fecha input:', fechaInput); // DEBUG

  if (!descripcion || !monto || monto <= 0) {
    mostrarError('Por favor completa todos los campos correctamente');
    return;
  }

  try {
    const response = await fetch(`${API_CONTABILIDAD}/gastos`, {
      method: 'POST',
      headers: obtenerHeaders(), // CAMBIADO
      body: JSON.stringify({
        descripcion,
        monto,
        categoria,
        fecha: fechaInput
      })
    });

    const responseData = await response.json();
    console.log('Respuesta del servidor:', responseData); // DEBUG

    if (!response.ok) throw new Error('Error al registrar gasto');

     // 🔄 Recargar resumen y lista de gastos
    await cargarResumenDia();

    // ✅ Mostrar mensaje de éxito
    mostrarSuccess('Gasto registrado con éxito');

    // 🧹 Limpiar formulario
    document.getElementById('form-gasto').reset();
  } catch (error) {
    mostrarError('Error al registrar gasto: ' + error.message);
  }
}

    async function eliminarGasto(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

  try {
    const response = await fetch(`${API_CONTABILIDAD}/gastos/${id}`, {
      method: 'DELETE',
      headers: obtenerHeaders() // AGREGADO
    });

    if (!response.ok) {
      const detalle = await response.text().catch(() => '');
      throw new Error('Error al eliminar gasto' + (detalle ? `: ${detalle}` : ''));
    }

    // 🔄 Recargar resumen y listas
    await cargarResumenDia();

    // ✅ Notificar éxito
    mostrarSuccess('Gasto eliminado con éxito');
  } catch (error) {
    mostrarError('Error al eliminar gasto: ' + error.message);
  }
}

    function generarGraficos() {
      if (!resumenActual) return;

      // Gráfico de distribución
      const ctxDist = document.getElementById('graficoDistribucion');
      if (ctxDist) {
        new Chart(ctxDist, {
          type: 'doughnut',
          data: {
            labels: ['Abonado', 'Gastos'],
            datasets: [{
              data: [resumenActual.ventas.totalAbonado, resumenActual.gastos.total],
              backgroundColor: ['#10b981', '#ef4444'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      }

      // Gráfico de flujo de efectivo
      const ctxFlujo = document.getElementById('graficoFlujo');
      if (ctxFlujo) {
        new Chart(ctxFlujo, {
          type: 'bar',
          data: {
            labels: ['Ventas Totales', 'Dinero Cobrado', 'Gastos', 'Efectivo Final'],
            datasets: [{
              data: [
                resumenActual.ventas.total,
                resumenActual.ventas.totalAbonado,
                resumenActual.gastos.total,
                resumenActual.saldos.efectivoDisponible
              ],
              backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return formatearPeso(value);
                  }
                }
              }
            }
          }
        });
      }
    }

    // Funciones de utilidad
    function formatearPeso(cantidad) {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(cantidad);
    }

    function mostrarLoading(mostrar) {
      document.getElementById('loading').classList.toggle('oculto', !mostrar);
    }

    function mostrarError(mensaje) {
      const errorDiv = document.getElementById('error-message');
      errorDiv.textContent = mensaje;
      errorDiv.classList.remove('oculto');
      setTimeout(() => errorDiv.classList.add('oculto'), 5000);
    }

    function mostrarSuccess(mensaje) {
      const successDiv = document.getElementById('success-message');
      successDiv.textContent = mensaje;
      successDiv.classList.remove('oculto');
      setTimeout(() => successDiv.classList.add('oculto'), 3000);
    }