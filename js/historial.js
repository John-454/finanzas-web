const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/facturas'; // Cambia por tu URL real

document.getElementById('buscarCliente').addEventListener('input', async function () {
  const termino = this.value.toLowerCase().trim();
  const resultados = document.getElementById('resultados');
  resultados.innerHTML = '';

  if (termino.length < 3) return;

  try {
    const res = await fetch(API_URL);
    const facturas = await res.json();

    // Filtrar facturas del cliente
    const facturasCliente = facturas.filter(f => f.cliente.toLowerCase().includes(termino));

    // Unificar todos los abonos
    const abonosTotales = facturasCliente.flatMap(f => f.historialAbonos.map(ab => ({
      monto: ab.monto,
      fecha: new Date(ab.fecha).toLocaleString(),
      facturaId: f._id
    })));

    if (abonosTotales.length === 0) {
      resultados.innerHTML = '<p>No se encontraron abonos para este cliente.</p>';
      return;
    }

    resultados.innerHTML = `<h2>Total de Abonos: ${abonosTotales.length}</h2>`;
    abonosTotales.forEach(ab => {
      const div = document.createElement('div');
      div.classList.add('abono-item');
      div.innerHTML = `
        <p><strong>Fecha:</strong> ${ab.fecha}</p>
        <p><strong>Monto:</strong> $${ab.monto}</p>
        <p><strong>Factura ID:</strong> ${ab.facturaId}</p>
      `;
      resultados.appendChild(div);
    });

  } catch (error) {
    console.error('Error al buscar abonos:', error);
    resultados.innerHTML = '<p>Error al buscar abonos.</p>';
  }
});
