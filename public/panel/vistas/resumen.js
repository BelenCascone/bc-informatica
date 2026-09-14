// Pestaña Resumen: números de arriba, gráfico de 6 meses, últimos movimientos y proyectos activos.
// Los avisos de precios del Resumen los dibuja vistas/precios.js.
import { state, alCambiarDatos } from "/panel/estado.js";
import { money, dateFmt } from "/panel/formato.js";

function renderKpis() {
  const ingresos = state.transactions.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const egresos = state.transactions.filter((t) => t.type === "egreso").reduce((s, t) => s + Number(t.amount), 0);
  const balance = ingresos - egresos;
  document.getElementById("kpi-balance").textContent = money(balance);
  document.getElementById("kpi-balance").className = "val " + (balance >= 0 ? "pos" : "neg");
  document.getElementById("kpi-ingresos").textContent = money(ingresos);
  document.getElementById("kpi-egresos").textContent = money(egresos);
  document.getElementById("kpi-activos").textContent = state.projects.filter((p) => p.status === "activo").length;
}

function renderChart() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }) });
  }
  const ingresosPorMes = months.map((m) =>
    state.transactions.filter((t) => t.type === "ingreso" && t.date?.startsWith(m.key)).reduce((s, t) => s + Number(t.amount), 0)
  );
  const egresosPorMes = months.map((m) =>
    state.transactions.filter((t) => t.type === "egreso" && t.date?.startsWith(m.key)).reduce((s, t) => s + Number(t.amount), 0)
  );

  const ctx = document.getElementById("chart-mensual");
  if (state.chart) state.chart.destroy();
  state.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: "Ingresos", data: ingresosPorMes, backgroundColor: "#C6FF00" },
        { label: "Egresos", data: egresosPorMes, backgroundColor: "#ff6b5e" },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#FBF8E6", font: { family: "JetBrains Mono" } } } },
      scales: {
        x: { ticks: { color: "#8F9E8B" }, grid: { color: "rgba(143,158,139,.1)" } },
        y: { ticks: { color: "#8F9E8B" }, grid: { color: "rgba(143,158,139,.1)" } },
      },
    },
  });
}

function renderUltimosMovimientos() {
  const body = document.getElementById("tabla-ultimos-mov");
  const ultimos = state.transactions.slice(0, 8);
  body.innerHTML = ultimos
    .map(
      (t) => `<tr>
      <td class="mono">${dateFmt(t.date)}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td>${t.description || "—"}</td>
      <td class="mono">${money(t.amount)}</td>
    </tr>`
    )
    .join("");
  document.getElementById("empty-ultimos-mov").hidden = ultimos.length > 0;
}

function renderProyectosActivos() {
  const body = document.getElementById("tabla-proyectos-activos");
  const activos = state.projects.filter((p) => p.status === "activo");
  body.innerHTML = activos
    .map((p) => `<tr><td>${p.name}</td><td class="dim">${p.client_name || "—"}</td></tr>`)
    .join("");
  document.getElementById("empty-proyectos-activos").hidden = activos.length > 0;
}

alCambiarDatos(() => {
  renderKpis();
  renderChart();
  renderUltimosMovimientos();
  renderProyectosActivos();
});
