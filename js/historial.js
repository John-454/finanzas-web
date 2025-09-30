const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
const API_FACTURAS = `${API_ROOT}/api/facturas`;
const API_EMPRESA = `${API_ROOT}/api/empresa`;
const API_ORIGIN = API_ROOT;

let empresaActual = null;
let facturaActualEdit = null;
let contadorProductos = 0;

// Event listener para búsqueda con debounce
let timeoutBusqueda;
document.getElementById('buscarCliente').addEventListener('input', function () {
  clearTimeout(timeoutBusqueda);
  const termino = this.value.toLowerCase().trim();
  
  // Limpiar resultados previos
  const resultados = document.getElementById('resultados');
  const estadoInicial = document.getElementById('estadoInicial');
  const estadoVacio = document.getElementById('estadoVacio');
  const estadoCarga = document.getElementById('estadoCarga');
  const resultadosHeader = document.getElementById('resultadosHeader');
  
  if (termino.length < 3) {
    resultados.innerHTML = '';
    estadoInicial.style.display = 'block';
    estadoVacio.style.display = 'none';
    estadoCarga.style.display = 'none';
    resultadosHeader.style.display = 'none';
    return;
  }

  // Mostrar estado de carga
  estadoInicial.style.display = 'none';
  estadoVacio.style.display = 'none';
  estadoCarga.style.display = 'block';
  resultadosHeader.style.display = 'none';
  resultados.innerHTML = '';

  // Buscar con debounce
  timeoutBusqueda = setTimeout(async () => {
    await buscarFacturas(termino);
  }, 500);
});

async function buscarFacturas(termino) {
  const resultados = document.getElementById('resultados');
  const estadoCarga = document.getElementById('estadoCarga');
  const estadoVacio = document.getElementById('estadoVacio');
  const resultadosHeader = document.getElementById('resultadosHeader');

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_FACTURAS, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Error al obtener facturas');
    }
    
    const facturas = await res.json();
    const facturasCliente = facturas.filter(f => f.cliente.toLowerCase().includes(termino));

    estadoCarga.style.display = 'none';

    if (facturasCliente.length === 0) {
      estadoVacio.style.display = 'block';
      resultadosHeader.style.display = 'none';
      return;
    }

    // Mostrar estadísticas
    mostrarEstadisticas(facturasCliente, termino);
    
    // Mostrar facturas
    mostrarFacturas(facturasCliente);
    
    resultadosHeader.style.display = 'block';
    estadoVacio.style.display = 'none';

  } catch (error) {
    console.error('Error al buscar facturas:', error);
    estadoCarga.style.display = 'none';
    estadoVacio.style.display = 'block';
    resultadosHeader.style.display = 'none';
  }
}

function mostrarEstadisticas(facturas, cliente) {
  const totalFacturas = facturas.length;
  const montoTotal = facturas.reduce((sum, f) => sum + f.total, 0);
  const totalAbonado = facturas.reduce((sum, f) => sum + (f.abono || 0), 0);
  const saldoPendiente = montoTotal - totalAbonado;

  document.getElementById('tituloResultados').textContent = `Historial de ${cliente.toUpperCase()}`;
  document.getElementById('totalFacturas').textContent = totalFacturas;
  document.getElementById('montoTotal').textContent = `$${montoTotal.toLocaleString()}`;
  document.getElementById('totalAbonado').textContent = `$${totalAbonado.toLocaleString()}`;
  document.getElementById('saldoPendiente').textContent = `$${saldoPendiente.toLocaleString()}`;
}

function mostrarFacturas(facturas) {
  const resultados = document.getElementById('resultados');
  resultados.innerHTML = '';

  facturas
    .sort((a, b) => new Date(b.createdAt || b.fecha) - new Date(a.createdAt || b.fecha))
    .forEach(factura => {
      const saldo = factura.total - (factura.abono || 0);
      
      // Determinar estado
      let estado = 'pendiente';
      if (saldo === 0) {
        estado = 'pagado';
      } else {
        const fechaCreacion = new Date(factura.createdAt || factura.fecha);
        const hoy = new Date();
        const diasTranscurridos = (hoy - fechaCreacion) / (1000 * 60 * 60 * 24);
        if (diasTranscurridos > 30 && saldo > 0) {
          estado = 'vencido';
        }
      }

      // Obtener último abono
      const ultimoAbono = factura.historialAbonos?.length
        ? factura.historialAbonos[factura.historialAbonos.length - 1]
        : null;

      const div = document.createElement('div');
      div.className = `factura-item ${estado}`;
      
      div.innerHTML = `
        <div class="factura-header">
          <div class="factura-numero">FAC-${factura._id.slice(-6)}</div>
          <div class="factura-fecha">${new Date(factura.createdAt || factura.fecha).toLocaleDateString()}</div>
        </div>
        
        <div class="cliente-info">
          <div class="cliente-nombre">${factura.cliente}</div>
        </div>
        
        <div class="info-financiera">
          <div class="info-item">
            <span class="info-label">Total</span>
            <span class="info-valor total">${factura.total.toLocaleString()}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pagado</span>
            <span class="info-valor pagado">${(factura.abono || 0).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="productos-info">
          <div class="productos-title">📦 Productos</div>
          <div class="productos-lista">
            ${factura.productos.map(p => `
              <div class="producto-item">
                <div class="producto-nombre">${p.nombre}</div>
                <div class="producto-detalles">${p.cantidad} × ${p.precioUnitario.toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="${ultimoAbono ? 'ultimo-abono' : 'ultimo-abono sin-abonos'}">
          <div class="abono-label">${ultimoAbono ? 'Último abono' : 'Sin abonos'}</div>
          <div class="abono-info">
            ${ultimoAbono 
              ? `$${ultimoAbono.monto.toLocaleString()} - ${new Date(ultimoAbono.fecha).toLocaleDateString()} - ${ultimoAbono.tipo ? `<span class="tipo-abono">${ultimoAbono.tipo === 'efectivo' ? '💵 Efectivo' : '📱 Nequi'}</span>` : ''}`
              : 'No se han registrado abonos'
            }
          </div>
        </div>
        
        <div class="acciones">
          <button class="btn btn-editar" onclick="editarFactura('${factura._id}')">
            ✏️ Editar
          </button>
          <button class="btn btn-pdf" onclick="descargarPDF('${factura._id}')">
            📄 PDF
          </button>
        </div>
      `;
      
      resultados.appendChild(div);
    });
}

// Función mejorada para editar factura
window.editarFactura = async function (facturaId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_FACTURAS}/detalle/${facturaId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Error al obtener la factura');
    }
    
    const factura = await res.json();
    facturaActualEdit = factura;
    contadorProductos = factura.productos.length;

    // Configurar modal
    document.getElementById('modalTitulo').textContent = `Editar Factura - ${factura.cliente}`;
    
    // Cargar productos
    mostrarProductosEnModal(factura.productos);
    
    // Mostrar modal
    document.getElementById('modalEditar').style.display = 'block';

  } catch (error) {
    console.error('Error al editar factura:', error);
    alert('Error al cargar la factura para edición');
  }
};

function mostrarProductosEnModal(productos) {
  const container = document.getElementById('productosContainer');
  container.innerHTML = '';

  productos.forEach((producto, index) => {
    const div = document.createElement('div');
    div.className = 'producto-item-modal';
    div.innerHTML = `
      <label>Nombre del producto:</label>
      <input type="text" value="${producto.nombre}" id="prod-nombre-${index}" />
      
      <label>Cantidad:</label>
      <input type="number" value="${producto.cantidad}" id="prod-cantidad-${index}" min="1" />
      
      <label>Precio Unitario:</label>
      <input type="number" value="${producto.precioUnitario}" id="prod-precio-${index}" min="0.01" step="0.01" />
      
      <button class="btn-eliminar" onclick="eliminarProducto(${index})">
        🗑️ Eliminar Producto
      </button>
    `;
    container.appendChild(div);
  });
}

window.eliminarProducto = function(index) {
  const producto = document.querySelector(`#prod-nombre-${index}`);
  if (producto && confirm('¿Estás seguro de eliminar este producto?')) {
    producto.closest('.producto-item-modal').remove();
  }
};

window.agregarProductoTemp = function() {
  const nombre = document.getElementById('nuevoProdNombre').value.trim();
  const cantidad = Number(document.getElementById('nuevoProdCantidad').value);
  const precio = Number(document.getElementById('nuevoProdPrecio').value);

  if (!nombre || cantidad <= 0 || precio <= 0) {
    alert('Por favor completa todos los campos correctamente.');
    return;
  }

  const container = document.getElementById('productosContainer');
  const nuevoProducto = document.createElement('div');
  nuevoProducto.className = 'producto-item-modal';
  
  nuevoProducto.innerHTML = `
    <label>Nombre del producto:</label>
    <input type="text" value="${nombre}" id="prod-nombre-${contadorProductos}" />
    
    <label>Cantidad:</label>
    <input type="number" value="${cantidad}" id="prod-cantidad-${contadorProductos}" min="1" />
    
    <label>Precio Unitario:</label>
    <input type="number" value="${precio}" id="prod-precio-${contadorProductos}" min="0.01" step="0.01" />
    
    <button class="btn-eliminar" onclick="eliminarProducto(${contadorProductos})">
      🗑️ Eliminar Producto
    </button>
  `;
  
  container.appendChild(nuevoProducto);
  contadorProductos++;

  // Limpiar campos
  document.getElementById('nuevoProdNombre').value = '';
  document.getElementById('nuevoProdCantidad').value = '1';
  document.getElementById('nuevoProdPrecio').value = '';
};

window.guardarFactura = async function() {
  if (!facturaActualEdit) return;

  const btnGuardar = document.getElementById('btnGuardar');
  const textoOriginal = btnGuardar.textContent;
  
  try {
    // Deshabilitar botón
    btnGuardar.disabled = true;
    btnGuardar.textContent = '💾 Guardando...';

    // Recoger todos los productos del modal
    const productos = [];
    const productosItems = document.querySelectorAll('.producto-item-modal');
    
    productosItems.forEach((item) => {
      const nombreInput = item.querySelector(`[id^="prod-nombre-"]`);
      const cantidadInput = item.querySelector(`[id^="prod-cantidad-"]`);
      const precioInput = item.querySelector(`[id^="prod-precio-"]`);
      
      if (nombreInput && cantidadInput && precioInput) {
        const nombre = nombreInput.value.trim();
        const cantidad = Number(cantidadInput.value);
        const precio = Number(precioInput.value);
        
        if (nombre && cantidad > 0 && precio > 0) {
          productos.push({
            nombre: nombre,
            cantidad: cantidad,
            precioUnitario: precio
          });
        }
      }
    });

    if (productos.length === 0) {
      alert('Debe haber al menos un producto.');
      return;
    }

    // Enviar actualización al backend
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_FACTURAS}/detalle/${facturaActualEdit._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productos })
    });

    if (response.ok) {
      // Si el servidor devuelve un PDF, descargarlo
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_actualizada_${facturaActualEdit._id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      alert('✅ Factura actualizada exitosamente');
      cerrarModal();
      
      // Recargar resultados si existe el input de búsqueda
      const buscarInput = document.getElementById('buscarCliente');
      if (buscarInput && buscarInput.value.trim().length >= 3) {
        await buscarFacturas(buscarInput.value.toLowerCase().trim());
      }
    } else {
      const error = await response.json();
      alert(`❌ Error: ${error.error || 'No se pudo actualizar la factura'}`);
    }
  } catch (error) {
    console.error('Error al guardar factura:', error);
    alert('❌ Error al guardar la factura');
  } finally {
    // Rehabilitar botón
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoOriginal;
  }
};

// Función para cargar datos de empresa
async function cargarEmpresa() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_EMPRESA}`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) throw new Error("No se pudo cargar la empresa");
    
    empresaActual = await response.json();
    console.log("🏢 Empresa cargada:", empresaActual);
  } catch (error) {
    console.error("⚠️ Error al cargar empresa:", error);
    empresaActual = {
      nombre: "Mi Empresa",
      direccion: "Dirección",
      ciudad: "Ciudad", 
      contacto: "Contacto",
      logo: null
    };
  }
}

// Función para generar PDF
function generarPDFFactura(datosFactura) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const empresa = empresaActual || {
      nombre: "Mi Empresa",
      direccion: "Dirección",
      ciudad: "Ciudad",
      contacto: "Contacto",
      logo: null
    };

    function renderPDFContent() {
      // Header empresa
      doc.setFontSize(16);
      doc.text(empresa.nombre, 20, 20);
      doc.setFontSize(10);
      doc.text(`Dirección: ${empresa.direccion}`, 20, 26);
      doc.text(`Ciudad: ${empresa.ciudad}`, 20, 32);
      doc.text(`Contacto: ${empresa.contacto}`, 20, 38);

      // Título factura
      doc.setFontSize(20);
      doc.text("Factura de Venta", 105, 50, { align: 'center' });

      // Información cliente
      doc.setFontSize(12);
      doc.text(`Cliente: ${datosFactura.cliente}`, 20, 60);
      doc.text(`Fecha: ${new Date(datosFactura.createdAt || datosFactura.fecha).toLocaleDateString()}`, 20, 70);
      doc.text(`Número: FAC-${datosFactura._id.slice(-6)}`, 150, 60);

      // Tabla de productos
      const columnas = ['Producto', 'Precio Ud.', 'Cantidad', 'Total'];
      const filas = datosFactura.productos.map(p => [
        p.nombre,
        `${p.precioUnitario.toFixed(2)}`,
        p.cantidad.toString(),
        `${(p.precioUnitario * p.cantidad).toFixed(2)}`
      ]);

      doc.autoTable({
        startY: 80,
        head: [columnas],
        body: filas,
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255]
        }
      });

      // Totales
      const finalY = doc.lastAutoTable.finalY + 10;
      const saldo = datosFactura.total - (datosFactura.abono || 0);
      
      doc.setFontSize(12);
      doc.text(`Total: ${datosFactura.total.toFixed(2)}`, 150, finalY);
      doc.text(`Abonado: ${(datosFactura.abono || 0).toFixed(2)}`, 150, finalY + 10);
      doc.text(`Saldo: ${saldo.toFixed(2)}`, 150, finalY + 20);

      // Historial de abonos
      // Historial de abonos
      if (datosFactura.historialAbonos && datosFactura.historialAbonos.length > 0) {
        doc.setFontSize(14);
        doc.text("Historial de Abonos:", 20, finalY + 40);
        
        const columnasAbonos = ['Fecha', 'Monto', 'Tipo'];
        const filasAbonos = datosFactura.historialAbonos.map(abono => [
          new Date(abono.fecha).toLocaleDateString(),
          `${abono.monto.toFixed(2)}`,
          abono.tipo ? (abono.tipo === 'efectivo' ? 'Efectivo' : 'Nequi') : 'N/A'
        ]);

        doc.autoTable({
          startY: finalY + 50,
          head: [columnasAbonos],
          body: filasAbonos,
          styles: {
            fontSize: 10,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255]
          }
        });
      }
    }

    // Logo si existe
    if (empresa.logo) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = empresa.logo.startsWith('/') ? `${API_ORIGIN}${empresa.logo}` : empresa.logo;
      
      img.onload = function() {
        doc.addImage(img, 'PNG', 130, 10, 60, 30);
        renderPDFContent();
        doc.save(`factura-${datosFactura.cliente}-${datosFactura._id}.pdf`);
      };
      
      img.onerror = function() {
        renderPDFContent();
        doc.save(`factura-${datosFactura.cliente}-${datosFactura._id}.pdf`);
      };
      return;
    }

    renderPDFContent();
    doc.save(`factura-${datosFactura.cliente}-${datosFactura._id}.pdf`);

    console.log("📄 PDF generado correctamente");

  } catch (error) {
    console.error("⚠️ Error al generar PDF:", error);
    alert("❌ Error al generar PDF");
  }
}

// Función para descargar PDF
window.descargarPDF = async function(facturaId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_FACTURAS}/detalle/${facturaId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener los datos de la factura');
    }

    const factura = await response.json();
    generarPDFFactura(factura);

  } catch (error) {
    console.error('Error al descargar PDF:', error);
    alert('❌ Error al generar el PDF: ' + error.message);
  }
};

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
  cargarEmpresa();
});