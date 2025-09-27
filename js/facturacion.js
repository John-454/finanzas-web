// ========================================
// CONFIGURACIÓN PARA PRODUCCIÓN
// ========================================

// Detección automática de entorno
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Base de API configurable (Render por defecto)
const API_ROOT = (typeof window !== 'undefined' && window.API_ROOT) || localStorage.getItem('API_ROOT') || 'https://api-finanzas-vk8w.onrender.com';
const API_PRODUCTOS = `${API_ROOT}/api/productos`;
const API_FACTURAS = `${API_ROOT}/api/facturas`;
const API_EMPRESA = `${API_ROOT}/api/empresa`;
const API_ORIGIN = API_ROOT;

// Sistema de logs condicionales
const logger = {
  log: (message, data = '') => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },
  error: (message, data = '') => {
    console.error(message, data);
  },
  warn: (message, data = '') => {
    if (isDevelopment) {
      console.warn(message, data);
    }
  }
};

// ========================================
// VARIABLES GLOBALES
// ========================================

let productosSeleccionados = [];
let todosLosProductos = [];
let empresaActual = null;

// ========================================
// VERIFICACIÓN DE AUTENTICACIÓN
// ========================================

document.addEventListener("DOMContentLoaded", function() {
  logger.log("🚀 Página facturación cargada - Entorno:", isDevelopment ? 'Desarrollo' : 'Producción');
  logger.log("🌐 API Root:", API_ROOT);
  
  // Verificar autenticación
  if (!isUserAuthenticated()) {
    logger.error("❌ Usuario no autenticado");
    alert("Debes iniciar sesión para acceder a esta página");
    window.location.href = "../login.html";
    return;
  }

  // Usuario autenticado - inicializar página
  logger.log("✅ Usuario autenticado, inicializando facturación");
  inicializarFacturacion();
});

// Verificar si el usuario está autenticado
function isUserAuthenticated() {
  try {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (!user || !token || user.trim() === "" || token.trim() === "") {
      return false;
    }

    // Verificar que el JSON del usuario sea válido
    JSON.parse(user);
    return true;
    
  } catch (error) {
    logger.error("❌ Error al verificar autenticación:", error);
    return false;
  }
}

// Obtener token de autorización
function getAuthToken() {
  return localStorage.getItem("token");
}

// Headers para peticiones autenticadas
function getAuthHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
    //"Authorization": token // Ajuste según cómo maneje la API el token
  };
}

// ========================================
// INICIALIZACIÓN
// ========================================

async function inicializarFacturacion() {
  try {
    logger.log("🔄 Cargando productos...");
    await cargarProductos();
    logger.log("✅ Facturación inicializada correctamente");
  } catch (error) {
    logger.error("❌ Error al inicializar facturación:", error);
    mostrarError("Error al cargar los datos. Por favor, recarga la página.");
  }
}

// ========================================
// GESTIÓN DE PRODUCTOS
// ========================================

// Cargar todos los productos
async function cargarProductos() {
  try {
    const response = await fetch(`${API_PRODUCTOS}`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    logger.log("📡 Respuesta cargar productos:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Sesión expirada");
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.log("✅ Productos cargados:", data.length || 0);

    // Manejar diferentes formatos de respuesta
    todosLosProductos = Array.isArray(data) ? data : (data.productos || data.data || []);

  } catch (error) {
    logger.error("❌ Error al cargar productos:", error);
    
    if (error.message === "Sesión expirada") {
      alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
      localStorage.clear();
      window.location.href = "../login.html";
      return;
    }
    
    mostrarError("Error al cargar productos: " + error.message);
    todosLosProductos = [];
  }
}

// Buscar producto
function buscarProducto() {
  const busqueda = document.getElementById("busqueda");
  const resultados = document.getElementById("resultados");
  
  if (!busqueda || !resultados) {
    logger.error("❌ Elementos de búsqueda no encontrados");
    return;
  }

  const termino = busqueda.value.trim().toLowerCase();
  
  if (termino === "") {
    resultados.innerHTML = "";
    resultados.style.display = "none";
    return;
  }

  // Filtrar productos
  const productosFiltrados = todosLosProductos.filter(producto => 
    producto.nombre && producto.nombre.toLowerCase().includes(termino)
  );

  mostrarResultadosBusqueda(productosFiltrados, termino);
}

// Mostrar resultados de búsqueda
function mostrarResultadosBusqueda(productos, termino) {
  const resultados = document.getElementById("resultados");
  
  if (!resultados) return;

  resultados.innerHTML = "";
  
  if (productos.length === 0) {
    // No se encontraron productos - opción para agregar nuevo
    resultados.innerHTML = `
      <li onclick="mostrarModalAgregarProducto('${termino}')" class="resultado-item nuevo-producto">
        <strong>+ Agregar "${termino}" como nuevo producto</strong>
      </li>
    `;
  } else {
    // Mostrar productos encontrados
    productos.forEach(producto => {
      const li = document.createElement("li");
      li.className = "resultado-item";
      li.innerHTML = `
        <span><strong>${producto.nombre}</strong> - $${producto.precioUnitario}</span>
      `;
      li.onclick = () => seleccionarProducto(producto);
      resultados.appendChild(li);
    });
  }
  
  resultados.style.display = "block";
}

// Seleccionar producto
function seleccionarProducto(producto) {
  logger.log("📦 Producto seleccionado:", producto.nombre);

  // Verificar si ya está en la tabla
  const productoExistente = productosSeleccionados.find(p => p._id === producto._id);

  if (productoExistente) {
    // Si ya existe, incrementar cantidad
    productoExistente.cantidad += 1;
    logger.log("➕ Cantidad incrementada:", productoExistente.cantidad);
  } else {
    // Normalizar el producto para que siempre tenga 'precio'
    const precio = producto.precio !== undefined ? producto.precio
                  : producto.precioUnitario !== undefined ? producto.precioUnitario
                  : 0;

    productosSeleccionados.push({
      ...producto,
      precio: precio,
      cantidad: 1
    });
    logger.log("🆕 Nuevo producto agregado");
  }

  // Actualizar tabla y limpiar búsqueda
  actualizarTablaProductos();
  limpiarBusqueda();
}

// Limpiar búsqueda
function limpiarBusqueda() {
  const busqueda = document.getElementById("busqueda");
  const resultados = document.getElementById("resultados");
  
  if (busqueda) busqueda.value = "";
  if (resultados) {
    resultados.innerHTML = "";
    resultados.style.display = "none";
  }
}

// ========================================
// GESTIÓN DE TABLA DE PRODUCTOS
// ========================================

// Actualizar tabla de productos seleccionados
function actualizarTablaProductos() {
  const tbody = document.getElementById("tablaProductos");
  
  if (!tbody) {
    logger.error("❌ Tabla de productos no encontrada");
    return;
  }

  tbody.innerHTML = "";

  productosSeleccionados.forEach((producto, index) => {

    const precio = producto.precioUnitario !== undefined ? producto.precioUnitario : producto.precio;
    const total = producto.precio * producto.cantidad;
    
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${producto.nombre}</td>
      <td>$${producto.precio.toFixed(2)}</td>
      <td>
        <button onclick="cambiarCantidad(${index}, -1)" class="btn-cantidad">-</button>
        <span class="cantidad">${producto.cantidad}</span>
        <button onclick="cambiarCantidad(${index}, 1)" class="btn-cantidad">+</button>
        <button onclick="eliminarProducto(${index})" class="btn-eliminar">🗑️</button>
      </td>
      <td>$${total.toFixed(2)}</td>
    `;
    
    tbody.appendChild(fila);
  });

  actualizarTotales();
}

// Cambiar cantidad de producto
function cambiarCantidad(index, cambio) {
  if (index < 0 || index >= productosSeleccionados.length) return;
  
  productosSeleccionados[index].cantidad += cambio;
  
  // No permitir cantidades menores a 1
  if (productosSeleccionados[index].cantidad < 1) {
    eliminarProducto(index);
    return;
  }
  
  actualizarTablaProductos();
  logger.log(`🔢 Cantidad actualizada: ${productosSeleccionados[index].nombre} = ${productosSeleccionados[index].cantidad}`);
}

// Eliminar producto
function eliminarProducto(index) {
  if (index < 0 || index >= productosSeleccionados.length) return;
  
  const productoEliminado = productosSeleccionados.splice(index, 1)[0];
  logger.log("🗑️ Producto eliminado:", productoEliminado.nombre);
  
  actualizarTablaProductos();
}

// ========================================
// CÁLCULOS Y TOTALES
// ========================================

// Actualizar totales
function actualizarTotales() {
  const total = calcularTotal();
  const abono = parseFloat(document.getElementById("abono")?.value || 0);
  const saldo = total - abono;

  // Actualizar elementos en el DOM
  const totalElement = document.getElementById("total");
  const saldoElement = document.getElementById("saldo");
  
  if (totalElement) totalElement.textContent = total.toFixed(2);
  if (saldoElement) {
    saldoElement.textContent = saldo.toFixed(2);
    saldoElement.style.color = saldo <= 0 ? "green" : "red";
  }
  
  logger.log(`💰 Totales actualizados - Total: $${total}, Abono: $${abono}, Saldo: $${saldo}`);
}

// Calcular total
function calcularTotal() {
  return productosSeleccionados.reduce((total, producto) => {
    return total + (producto.precio * producto.cantidad);
  }, 0);
}

// ========================================
// MODAL AGREGAR PRODUCTO
// ========================================

// Mostrar modal para agregar nuevo producto
function mostrarModalAgregarProducto(nombre) {
  const modal = document.getElementById("modalAgregarProducto");
  const nombreInput = document.getElementById("nuevo-nombre");
  const precioInput = document.getElementById("nuevo-precio");
  
  if (modal && nombreInput && precioInput) {
    nombreInput.value = nombre;
    precioInput.value = "";
    precioInput.focus();
    modal.style.display = "block";
    
    logger.log("📝 Modal agregar producto abierto para:", nombre);
  }
}

// Cerrar modal
function cerrarModalAgregarProducto() {
  const modal = document.getElementById("modalAgregarProducto");
  if (modal) {
    modal.style.display = "none";
  }
}

// Guardar nuevo producto
async function guardarNuevoProducto() {
  const nombre = document.getElementById("nuevo-nombre")?.value.trim();
  const precio = parseFloat(document.getElementById("nuevo-precio")?.value || 0);
  
  if (!nombre || precio <= 0) {
    mostrarError("Por favor, completa todos los campos correctamente");
    return;
  }

  try {
    logger.log("💾 Guardando nuevo producto:", nombre);
    
    const response = await fetch(`${API_PRODUCTOS}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ nombre, precioUnitario: precio})
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const nuevoProducto = await response.json();
    logger.log("✅ Producto creado:", nuevoProducto);

    // Agregar a la lista local y seleccionar
    const producto = nuevoProducto.producto || nuevoProducto;
    todosLosProductos.push(producto);
    seleccionarProducto(producto);
    
    // Cerrar modal
    cerrarModalAgregarProducto();
    mostrarExito("Producto agregado correctamente");

  } catch (error) {
    logger.error("❌ Error al crear producto:", error);
    mostrarError("Error al agregar producto: " + error.message);
  }
}

// ========================================
// GUARDAR FACTURA
// ========================================

// Guardar factura
async function guardarFactura() {
  // Obtén los valores del formulario
  const cliente = document.getElementById('cliente').value.trim();
  const abono = parseFloat(document.getElementById('abono').value) || 0;
  const total = calcularTotal();
  const saldo = total - abono;

  // Validación básica
  if (!cliente || productosSeleccionados.length === 0) {
    alert('Debes ingresar un cliente y al menos un producto.');
    return;
  }

  // Limpia los productos para enviar solo lo necesario
  const productosParaFactura = productosSeleccionados.map(p => ({
    nombre: p.nombre,
    cantidad: p.cantidad,
    precioUnitario: p.precioUnitario !== undefined ? p.precioUnitario : p.precio
  }));

  const datosFactura = {
    cliente,
    productos: productosParaFactura,
    total,
    abono,
    saldo
  };

  try {
    const response = await fetch(`${API_FACTURAS}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(datosFactura)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    alert('Factura guardada correctamente');

    // Genera y descarga el PDF localmente
    generarPDF(datosFactura);

    // Limpia la interfaz si lo deseas
    limpiarFormulario();
  } catch (error) {
    alert('Error al guardar factura: ' + error.message);
    console.error('Error al guardar factura:', error);
  }

}

// ========================================
// GENERAR PDF
// ========================================

// Generar PDF de la factura
function generarPDF(datosFactura) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Datos de empresa
    const empresa = empresaActual || {
      nombre: "Mi Empresa",
      direccion: "Dirección",
      ciudad: "Ciudad",
      contacto: "Contacto",
      logo: null
    };

    // Renderizar el contenido del PDF
    function renderPDFContent() {
      // Datos de empresa
      doc.setFontSize(16);
      doc.text(empresa.nombre, 20, 20);
      doc.setFontSize(10);
      doc.text(`Dirección: ${empresa.direccion}`, 20, 26);
      doc.text(`Ciudad: ${empresa.ciudad}`, 20, 32);
      doc.text(`Contacto: ${empresa.contacto}`, 20, 38);

      // Encabezado factura
      doc.setFontSize(20);
      doc.text("Factura de Venta", 105, 50, { align: 'center' });

      doc.setFontSize(12);
      doc.text(`Cliente: ${datosFactura.cliente}`, 20, 60);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 70);

      // Tabla de productos
      const columnas = ['Producto', 'Precio Ud.', 'Cantidad', 'Total'];
      const filas = datosFactura.productos.map(p => [
        p.nombre,
        `$${(p.precioUnitario !== undefined ? p.precioUnitario : p.precio).toFixed(2)}`,
        p.cantidad.toString(),
        `$${((p.precioUnitario !== undefined ? p.precioUnitario : p.precio) * p.cantidad).toFixed(2)}`
      ]);

      doc.autoTable({
        startY: 80,
        head: [columnas],
        body: filas,
      });

      // Totales
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text(`Total: $${datosFactura.total.toFixed(2)}`, 150, finalY);
      doc.text(`Abono: $${datosFactura.abono.toFixed(2)}`, 150, finalY + 10);
      doc.text(`Saldo: $${datosFactura.saldo.toFixed(2)}`, 150, finalY + 20);
    }

    // Logo en la parte superior derecha
    if (empresa.logo) {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Permite cargar imágenes externas si el servidor lo permite
      img.src = empresa.logo.startsWith('/') ? `${API_ORIGIN}${empresa.logo}` : empresa.logo;
      img.onload = function() {
        doc.addImage(img, 'PNG', 130, 10, 80, 70); // x, y, width, height
        renderPDFContent();
        doc.save(`factura-${datosFactura.cliente}-${Date.now()}.pdf`);
      };
      img.onerror = function() {
        renderPDFContent();
        doc.save(`factura-${datosFactura.cliente}-${Date.now()}.pdf`);
      };
      return; // Espera a que cargue la imagen
    }

    // Si no hay logo, genera el resto del PDF
    renderPDFContent();
    doc.save(`factura-${datosFactura.cliente}-${Date.now()}.pdf`);

    logger.log("📄 PDF generado correctamente");

  } catch (error) {
    logger.error("❌ Error al generar PDF:", error);
    mostrarError("Error al generar PDF");
  }
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

// Limpiar formulario
function limpiarFormulario() {
  const cliente = document.getElementById("cliente");
  const abono = document.getElementById("abono");
  
  if (cliente) cliente.value = "";
  if (abono) abono.value = "";
  
  productosSeleccionados = [];
  actualizarTablaProductos();
  limpiarBusqueda();
  
  logger.log("🧹 Formulario limpiado");
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
  alert("❌ " + mensaje); // En producción podrías usar un modal más elegante
}

// Mostrar mensaje de éxito
function mostrarExito(mensaje) {
  alert("✅ " + mensaje); // En producción podrías usar un modal más elegante
}

// ========================================
// EVENT LISTENERS GLOBALES
// ========================================

// Cerrar resultados al hacer clic fuera
document.addEventListener('click', function(event) {
  const busqueda = document.getElementById("busqueda");
  const resultados = document.getElementById("resultados");
  
  if (busqueda && resultados && !busqueda.contains(event.target) && !resultados.contains(event.target)) {
    resultados.style.display = "none";
  }
});

// Cerrar modal al hacer clic fuera
window.addEventListener('click', function(event) {
  const modal = document.getElementById("modalAgregarProducto");
  if (modal && event.target === modal) {
    cerrarModalAgregarProducto();
  }
});

// ========================================
// CARGA DE EMPRESA
// ========================================

async function cargarEmpresa() {
  try {
    const response = await fetch(`${API_EMPRESA}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("No se pudo cargar la empresa");
    empresaActual = await response.json();
    logger.log("🏢 Empresa cargada:", empresaActual);
  } catch (error) {
    logger.error("❌ Error al cargar empresa:", error);
    empresaActual = null;
  }
}

// Llama a cargarEmpresa al inicializar la página
document.addEventListener("DOMContentLoaded", async function() {
  await cargarEmpresa();
  // ...el resto de inicialización...
});