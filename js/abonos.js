const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/facturas';
    let facturas = [];
    let facturaSeleccionada = null;

    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const res = await fetch(API_URL);
        facturas = await res.json();
        mostrarFacturas(facturas);
      } catch (err) {
        console.error('Error al cargar facturas:', err);
      }
    });

    function mostrarFacturas(lista) {
      const contenedor = document.getElementById('listaFacturas');
      contenedor.innerHTML = '';

      if (lista.length === 0) {
        contenedor.innerHTML = '<p>No se encontraron facturas.</p>';
        return;
      }

      lista
        
        .forEach(f => {
          const saldo = f.total - (f.abono || 0);
          const div = document.createElement('div');
          div.className = 'factura';
          div.innerHTML = `
            <p><strong>Cliente:</strong> ${f.cliente}</p>
            <p><strong>Fecha:</strong> ${new Date(f.createdAt).toLocaleString()}</p>
            <p><strong>Total:</strong> $${f.total}</p>
            <p><strong>Abonado:</strong> $${f.abono || 0}</p>
            <p><strong>Saldo:</strong> $${saldo}</p>
            ${saldo > 0
              ? `<button onclick="abrirAbono('${f._id}')">Abonar</button>`
              : `<p class="cancelado">Cancelado</p>`
            }
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
      document.getElementById('modalTotal').textContent = facturaSeleccionada.total;
      document.getElementById('modalAbonado').textContent = facturaSeleccionada.abono || 0;
      document.getElementById('modalSaldo').textContent = facturaSeleccionada.total - (facturaSeleccionada.abono || 0);
      document.getElementById('nuevoAbono').value = '';

      document.getElementById('modalAbono').style.display = 'block';
    }

    function cerrarModal() {
      document.getElementById('modalAbono').style.display = 'none';
    }

    function registrarAbono() {
  const monto = Number(document.getElementById('nuevoAbono').value);
  if (!monto || isNaN(monto) || monto <= 0) {
    alert('Ingrese un monto válido.');
    return;
  }

  fetch(`${API_URL}/${facturaSeleccionada._id}/abono`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ abono: monto }),
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Error al registrar el abono');
      }
      return res.text();
    })
    .then(() => {
      alert('Abono registrado correctamente');
      cerrarModal();
      // Recargar las facturas actualizadas
      return fetch(API_URL);
    })
    .then(res => res.json())
    .then(data => {
      facturas = data;
      mostrarFacturas(facturas);
    })
    .catch(err => {
      console.error('Error al registrar abono:', err);
      alert('Error al registrar el abono');
    });
}
