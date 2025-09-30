// Detección automática de entorno
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Configuración de la API
const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
//const API_ROOT = 'http://localhost:3000';
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
      cargarResumenMesActual();
      cargarHistorialMensual();
    };

    function mostrarHoy() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const localDate = `${y}-${m}-${d}`;
  
  document.getElementById('fechaSeleccionada').value = localDate;
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
      descripcionSaldo.textContent = 'Abonos - Gastos'; // Cambiar de "Abonos - Gastos"
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

      lista.innerHTML = gastos.map(gasto => {
      const iconoTipo = gasto.tipo === 'nequi' ? '📱' : '💵';
      const textoTipo = gasto.tipo === 'nequi' ? 'Nequi' : 'Efectivo';
      
      return `
        <div class="gasto-item">
          <div class="gasto-info">
            <h4>${gasto.descripcion}</h4>
            <small>Categoría: ${gasto.categoria} | ${new Date(gasto.fecha).toLocaleTimeString()}</small>
            <div style="margin-top: 5px;">
              <span style="background: #f0f9ff; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 600;">
                ${iconoTipo} ${textoTipo}
              </span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div class="gasto-monto">${formatearPeso(gasto.monto)}</div>
            <button class="btn-danger" onclick="eliminarGasto('${gasto._id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
    }

    async function agregarGasto(event) {
    event.preventDefault();
  
  const descripcion = document.getElementById('descripcionGasto').value;
  const monto = parseFloat(document.getElementById('montoGasto').value);
  const categoria = document.getElementById('categoriaGasto').value;
  const tipo = document.getElementById('tipoGasto').value;
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
        tipo, // AGREGADO
        fecha: fechaInput
      })
    });

    const responseData = await response.json();
    console.log('Respuesta del servidor:', responseData); // DEBUG

    if (!response.ok) throw new Error('Error al registrar gasto');

     // 🔄 Recargar resumen y lista de gastos
    await cargarResumenDia(), await cargarResumenMesActual();

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
    await cargarResumenDia(), await cargarResumenMesActual();

    // ✅ Notificar éxito
    mostrarSuccess('Gasto eliminado con éxito');
  } catch (error) {
    mostrarError('Error al eliminar gasto: ' + error.message);
  }
}

// Cargar resumen del mes en curso (dinámico)
async function cargarResumenMesActual() {
  try {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth() + 1;

    const res = await fetch(`${API_CONTABILIDAD}/resumen-mensual/${anio}/${mes}`, {
      headers: obtenerHeaders()
    });

    if (!res.ok) throw new Error("Error al cargar resumen mes actual");

    const data = await res.json();

    document.getElementById("nombreMesActual").textContent =
      now.toLocaleString("es-ES", { month: "long", year: "numeric" });

    document.getElementById("ventasMesActual").textContent =
      formatearPeso(data.ventas.total);

    document.getElementById("saldoMesActual").textContent =
      "Saldo Neto: " + formatearPeso(data.saldos.saldoNeto);

  } catch (err) {
    console.error(err);
  }
}

// Cargar historial de meses cerrados (guardados en BD)
async function cargarHistorialMensual() {
  try {
    const filtroAnio = document.getElementById("anioFiltro").value;

    const res = await fetch(`${API_CONTABILIDAD}/historial-mensual`, {
      headers: obtenerHeaders()
    });
    if (!res.ok) throw new Error("Error al cargar historial mensual");

    let historial = await res.json();
    
    // Obtener el año actual
    const anioActual = new Date().getFullYear();

    // Primera vez que se carga: llenar select con años únicos y seleccionar año actual
    const anios = [...new Set(historial.map(h => h.anio))].sort((a, b) => b - a);
    
    // Asegurar que el año actual esté en la lista aunque no tenga datos
    if (!anios.includes(anioActual)) {
      anios.unshift(anioActual);
      anios.sort((a, b) => b - a);
    }
    
    const select = document.getElementById("anioFiltro");
    
    // Solo actualizar el select si no tiene el filtro aplicado (evita reseteo)
    if (!filtroAnio) {
      select.innerHTML = '<option value="">Todos</option>' +
        anios.map(a => `<option value="${a}" ${a == anioActual ? 'selected' : ''}>${a}</option>`).join("");
    }

    // Si no hay filtro aplicado, usar el año actual por defecto
    const anioParaFiltrar = filtroAnio || anioActual;
    
    // Crear estructura completa de 12 meses para el año seleccionado
    const mesesCompletos = await crearEstructuraMesesCompletos(anioParaFiltrar, historial);

    // Referencias a los elementos
    const tbody = document.getElementById("historialBody") || document.getElementById("tablaHistorialMensual");
    const historialVacio = document.getElementById("historialVacio");
    const tablaContainer = document.querySelector('.tabla-container');

    // Función para obtener nombre del mes
    const obtenerNombreMes = (numeroMes) => {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return meses[numeroMes - 1] || `Mes ${numeroMes}`;
    };

    // Función para obtener clase CSS según el valor y tipo
    const getClaseValor = (valor, tipo, tipoRegistro = 'cerrado') => {
      let claseBase = '';
      
      if (tipoRegistro === 'sin-datos') {
        return 'valor-sin-datos';
      }
      
      if (tipoRegistro === 'dinamico') {
        claseBase = 'valor-dinamico ';
      }
      
      if (tipo === 'saldo') {
        return claseBase + (valor > 0 ? 'valor-positivo valor-saldo' : 
               valor < 0 ? 'valor-negativo valor-saldo' : 'valor-neutro valor-saldo');
      } else if (tipo === 'ventas' || tipo === 'abonos') {
        return claseBase + (valor > 0 ? 'valor-positivo valor-ventas' : 'valor-neutro valor-ventas');
      } else {
        return claseBase + (valor > 0 ? 'valor-negativo valor-gastos' : 'valor-neutro valor-gastos');
      }
    };

    // Limpiar tabla
    tbody.innerHTML = '';

    // Mostrar tabla siempre (ya que siempre hay 12 meses)
    if (tablaContainer) tablaContainer.style.display = 'block';
    if (historialVacio) historialVacio.classList.add('oculto');

    // Llenar tabla con todos los meses
    mesesCompletos.forEach(mes => {
  const fila = document.createElement('tr');
  const fechaMes = `${obtenerNombreMes(mes.numeroMes)} ${mes.anio}`;
  
  // Agregar clases especiales según el tipo de registro
  if (mes.tipoRegistro === 'sin-datos') {
    fila.classList.add('mes-sin-datos');
  } else if (mes.tipoRegistro === 'dinamico') {
    fila.classList.add('mes-dinamico');
  }

  // Función para mostrar valor según el tipo
  const mostrarValor = (valor, tipo) => {
    if (mes.tipoRegistro === 'sin-datos') {
      return '<span class="sin-datos">Sin datos</span>';
    } else if (mes.tipoRegistro === 'dinamico') {
      return `<span class="valor-temp">${formatearPeso(valor)} <small>(temporal)</small></span>`;
    } else {
      return formatearPeso(valor);
    }
  };

  // Botón de cierre solo si es dinámico
  const botonCierre = mes.tipoRegistro === 'dinamico'
    ? `<button class="btn-cerrar" onclick="cerrarMes(${mes.anio}, ${mes.numeroMes})">Cerrar</button>`
    : '';

  fila.innerHTML = `
    <td class="mes-col">
      ${fechaMes}
      ${mes.tipoRegistro === 'dinamico' ? '<span class="indicador-dinamico">🔄</span>' : ''}
    </td>
    <td class="${getClaseValor(mes.totalVentas, 'ventas', mes.tipoRegistro)}">
      ${mostrarValor(mes.totalVentas, 'ventas')}
    </td>
    <td class="${getClaseValor(mes.totalGastos, 'gastos', mes.tipoRegistro)}">
      ${mostrarValor(mes.totalGastos, 'gastos')}
    </td>
    <td class="${getClaseValor(mes.saldoNeto, 'saldo', mes.tipoRegistro)}">
      ${mostrarValor(mes.saldoNeto, 'saldo')}
    </td>
    <td>
      ${botonCierre}
    </td>
  `;
  tbody.appendChild(fila);
});


    // Mostrar resumen del período seleccionado
    const mesesConDatos = mesesCompletos.filter(m => m.tipoRegistro !== 'sin-datos');
    if (mesesConDatos.length > 0) {
      mostrarResumenPeriodo(mesesConDatos, anioParaFiltrar);
    }

  } catch (err) {
    console.error('Error al cargar historial mensual:', err);
    
    // Mostrar error en la interfaz
    const tbody = document.getElementById("historialBody") || document.getElementById("tablaHistorialMensual");
    const historialVacio = document.getElementById("historialVacio");
    
    if (tbody) tbody.innerHTML = '';
    
    if (historialVacio) {
      historialVacio.innerHTML = `
        <div class="error">
          <h4>Error al cargar datos</h4>
          <p>No se pudieron cargar los datos del historial. Intenta nuevamente.</p>
        </div>
      `;
      historialVacio.classList.remove('oculto');
    }
  }
}

async function cerrarMes(anio, mes) {
  if (!confirm(`¿Seguro que deseas cerrar ${mes}/${anio}? Una vez cerrado, los valores quedarán fijos.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_CONTABILIDAD}/cerrar-mes`, {
      method: "POST",
      headers: {
        ...obtenerHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ anio, mes })
    });

    if (!res.ok) throw new Error("Error al cerrar mes");

    const data = await res.json();
    alert("✅ " + data.mensaje);

    // Refrescar la tabla para que ya aparezca como cerrado
    cargarHistorialMensual();

  } catch (err) {
    console.error("Error al cerrar mes:", err);
    alert("❌ Error al cerrar mes");
  }
}


// Función para cargar datos dinámicos de un mes específico
async function cargarDatosDinamicosMes(anio, mes) {
  try {
    const res = await fetch(`${API_CONTABILIDAD}/resumen-mensual/${anio}/${mes}`, {
      headers: obtenerHeaders()
    });

    if (!res.ok) {
      // Si no hay datos, retornar estructura vacía
      return {
        totalVentas: 0,
        totalGastos: 0,
        saldoNeto: 0,
        tieneRegistros: false
      };
    }

    const data = await res.json();
    
    return {
      totalVentas: data.ventas?.total || 0,
      totalAbonos: data.abonos?.total || 0, // Ajusta según tu estructura de datos
      totalGastos: data.gastos?.total || 0, // Ajusta según tu estructura de datos
      saldoNeto: data.saldos?.saldoNeto || 0,
      tieneRegistros: true
    };

  } catch (err) {
    console.error(`Error al cargar datos dinámicos del mes ${mes}/${anio}:`, err);
    return {
      totalVentas: 0,
      totalAbonos: 0,
      totalGastos: 0,
      saldoNeto: 0,
      tieneRegistros: false
    };
  }
}

// Función para crear estructura completa de 12 meses con datos dinámicos
async function crearEstructuraMesesCompletos(anio, historialDB) {
  const mesesCompletos = [];
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  
  // Crear objeto lookup para búsqueda rápida de datos existentes (cerrados)
  const datosExistentes = {};
  historialDB.forEach(registro => {
    if (registro.anio == anio) {
      datosExistentes[registro.mes] = registro;
    }
  });
  
  // Generar los 12 meses
  for (let mes = 1; mes <= 12; mes++) {
    const datosDelMes = datosExistentes[mes];
    
    if (datosDelMes) {
      // Mes con datos cerrados (registrados en BD)
      mesesCompletos.push({
        anio: parseInt(anio),
        numeroMes: mes,
        totalVentas: datosDelMes.totalVentas || 0,
        totalAbonos: datosDelMes.totalAbonos || 0,
        totalGastos: datosDelMes.totalGastos || 0,
        saldoNeto: datosDelMes.saldoNeto || 0,
        tipoRegistro: 'cerrado'
      });
    } else if (anio == anioActual) {
      // Es del año actual, intentar cargar datos dinámicos
      const datosDinamicos = await cargarDatosDinamicosMes(anio, mes);
      
      if (datosDinamicos.tieneRegistros || mes <= mesActual) {
        // Mes con datos dinámicos (no cerrado pero con movimientos)
        mesesCompletos.push({
          anio: parseInt(anio),
          numeroMes: mes,
          totalVentas: datosDinamicos.totalVentas,
          totalAbonos: datosDinamicos.totalAbonos,
          totalGastos: datosDinamicos.totalGastos,
          saldoNeto: datosDinamicos.saldoNeto,
          tipoRegistro: 'dinamico'
        });
      } else {
        // Mes futuro sin datos
        mesesCompletos.push({
          anio: parseInt(anio),
          numeroMes: mes,
          totalVentas: 0,
          totalAbonos: 0,
          totalGastos: 0,
          saldoNeto: 0,
          tipoRegistro: 'sin-datos'
        });
      }
    } else {
      // Año diferente al actual sin datos registrados
      mesesCompletos.push({
        anio: parseInt(anio),
        numeroMes: mes,
        totalVentas: 0,
        totalAbonos: 0,
        totalGastos: 0,
        saldoNeto: 0,
        tipoRegistro: 'sin-datos'
      });
    }
  }
  
  // Ordenar por mes (enero a diciembre)
  return mesesCompletos.sort((a, b) => a.numeroMes - b.numeroMes);
}

// Función para mostrar resumen del período
function mostrarResumenPeriodo(historial, anio) {
  const totalVentas = historial.reduce((sum, h) => sum + (h.totalVentas || 0), 0);
  const totalAbonos = historial.reduce((sum, h) => sum + (h.totalAbonos || 0), 0);
  const totalGastos = historial.reduce((sum, h) => sum + (h.totalGastos || 0), 0);
  const saldoNeto = totalVentas + totalAbonos - totalGastos;
  
  const mesesCerrados = historial.filter(h => h.tipoRegistro === 'cerrado').length;
  const mesesDinamicos = historial.filter(h => h.tipoRegistro === 'dinamico').length;

  console.log(`Resumen ${anio || 'Total'} - Cerrados: ${mesesCerrados}, Dinámicos: ${mesesDinamicos}:`, {
    totalVentas: formatearPeso(totalVentas),
    totalAbonos: formatearPeso(totalAbonos),
    totalGastos: formatearPeso(totalGastos),
    saldoNeto: formatearPeso(saldoNeto)
  });
}

// Función para refrescar datos dinámicos (útil para actualizaciones en tiempo real)
async function refrescarDatosDinamicos() {
  const anioSeleccionado = document.getElementById("anioFiltro").value || new Date().getFullYear();
  const anioActual = new Date().getFullYear();
  
  // Solo refrescar si estamos viendo el año actual
  if (anioSeleccionado == anioActual) {
    await cargarHistorialMensual();
  }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  cargarHistorialMensual();
  
  // Opcional: Refrescar datos dinámicos cada 30 segundos si se está viendo el año actual
  setInterval(() => {
    const anioSeleccionado = document.getElementById("anioFiltro").value || new Date().getFullYear();
    const anioActual = new Date().getFullYear();
    
    if (anioSeleccionado == anioActual) {
      refrescarDatosDinamicos();
    }
  }, 30000); // 30 segundos
});

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