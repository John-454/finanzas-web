const API_URL = 'https://api-finanzas-vk8w.onrender.com/api/facturas'; // ← Ajusta si tu API cambia

let facturas = [];

window.onload = async () => {
  await obtenerFacturas();
  mostrarResumenGeneral();
  generarGraficoGeneral();
};

async function obtenerFacturas() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    facturas = data;
  } catch (err) {
    console.error('Error al obtener facturas:', err);
    alert('No se pudieron cargar los datos.');
  }
}

function mostrarResumenGeneral() {
  const total = facturas.reduce((acc, f) => acc + f.total, 0);
  const saldoPendiente = facturas.reduce((acc, f) => acc + (f.total - (f.abono || 0)), 0);

  document.getElementById('totalVendido').textContent = `$${total}`;
  document.getElementById('totalSaldo').textContent = `$${saldoPendiente}`;
}

function generarGraficoGeneral() {
  const total = facturas.reduce((acc, f) => acc + f.total, 0);
  const saldoPendiente = facturas.reduce((acc, f) => acc + (f.total - (f.abono || 0)), 0);

  const ctx = document.getElementById('graficoGeneral').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Total Vendido', 'Saldo Pendiente'],
      datasets: [{
        data: [total, saldoPendiente],
        backgroundColor: ['#10b981', '#f87171'],
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

function buscarPorCliente() {
  const termino = document.getElementById('busquedaCliente').value.toLowerCase();
  const clienteFacturas = facturas.filter(f =>
    f.cliente.toLowerCase().includes(termino)
  );

  if (clienteFacturas.length === 0) {
    alert('No se encontraron facturas para este cliente.');
    return;
  }

  const total = clienteFacturas.reduce((acc, f) => acc + f.total, 0);
  const abono = clienteFacturas.reduce((acc, f) => acc + (f.abono || 0), 0);
  const saldo = total - abono;

  // Mostrar resumen
  document.getElementById('clienteResumen').classList.remove('oculto');
  document.getElementById('clienteResumen').innerHTML = `
    <h3>Resumen de "${termino}":</h3>
    <p>Total: $${total}</p>
    <p>Abonado: $${abono}</p>
    <p>Saldo Pendiente: $${saldo}</p>
    <canvas id="graficoCliente"></canvas>
  `;

  setTimeout(() => {
    generarGraficoCliente(total, abono, saldo);
  }, 100);
}

function generarGraficoCliente(total, abono, saldo) {
  const ctx = document.getElementById('graficoCliente').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Total', 'Abonado', 'Saldo'],
      datasets: [{
        data: [total, abono, saldo],
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444']
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
