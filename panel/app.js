import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const { url, anonKey } = window.SUPABASE_CONFIG || {};
const configOk = Boolean(url && anonKey && !url.includes("PEGA_ACA") && !anonKey.includes("PEGA_ACA"));
if (!configOk) {
  document.getElementById("login-error").hidden = false;
  document.getElementById("login-error").textContent =
    "Falta configurar panel/config.js con la URL y la anon key de Supabase.";
  document.getElementById("login-btn").disabled = true;
}
const supabase = createClient(
  configOk ? url : "https://placeholder.supabase.co",
  configOk ? anonKey : "placeholder-anon-key"
);

const CATEGORIAS = ["service", "sistemas", "clases", "asesoria", "otros"];
const money = (n) =>
  Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dateFmt = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

let state = { projects: [], transactions: [], user: null, chart: null };

// ---------- auth ----------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    state.user = session.user;
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = "flex";
  appView.style.display = "none";
}

function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  document.getElementById("user-email").textContent = state.user?.email || "";
  loadAll();
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("login-btn");
  const errEl = document.getElementById("login-error");
  errEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Entrando...";
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false;
  btn.textContent = "Entrar";
  if (error) {
    errEl.textContent = "Email o contraseña incorrectos.";
    errEl.hidden = false;
    return;
  }
  state.user = data.user;
  showApp();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  state.user = null;
  showLogin();
});

// ---------- tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
  });
});

// ---------- data loading ----------
async function loadAll() {
  const [{ data: projects, error: pErr }, { data: transactions, error: tErr }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
  ]);
  if (pErr) toast("Error cargando proyectos: " + pErr.message);
  if (tErr) toast("Error cargando movimientos: " + tErr.message);
  state.projects = projects || [];
  state.transactions = transactions || [];
  renderAll();
}

function renderAll() {
  renderKpis();
  renderChart();
  renderUltimosMovimientos();
  renderProyectosActivos();
  renderProyectos();
  renderMovimientos();
  renderProyectoFiltroOptions();
}

// ---------- resumen ----------
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

// ---------- proyectos ----------
function renderProyectos() {
  const filtro = document.getElementById("filtro-estado-proyecto").value;
  const list = state.projects.filter((p) => !filtro || p.status === filtro);
  const body = document.getElementById("tabla-proyectos");
  body.innerHTML = list
    .map(
      (p) => `<tr>
      <td>${p.name}</td>
      <td class="dim">${p.client_name || "—"}</td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td class="mono">${dateFmt(p.start_date)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-project="${p.id}">Editar</button>
        <button class="icon-btn danger" data-del-project="${p.id}">Borrar</button>
      </div></td>
    </tr>`
    )
    .join("");
  document.getElementById("empty-proyectos").hidden = list.length > 0;
}

document.getElementById("filtro-estado-proyecto").addEventListener("change", renderProyectos);

document.getElementById("tabla-proyectos").addEventListener("click", (e) => {
  const editId = e.target.dataset.editProject;
  const delId = e.target.dataset.delProject;
  if (editId) openProjectModal(state.projects.find((p) => p.id === editId));
  if (delId) deleteProject(delId);
});

document.getElementById("btn-nuevo-proyecto").addEventListener("click", () => openProjectModal());

function openProjectModal(project) {
  const isEdit = !!project;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar proyecto" : "Nuevo proyecto"}</h3>
    <form id="project-form">
      <div class="field"><label>Nombre</label><input name="name" required value="${project?.name || ""}"></div>
      <div class="field"><label>Cliente</label><input name="client_name" value="${project?.client_name || ""}"></div>
      <div class="field-row">
        <div class="field"><label>Estado</label>
          <select name="status">
            ${["activo", "pausado", "finalizado"].map((s) => `<option value="${s}" ${project?.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Inicio</label><input type="date" name="start_date" value="${project?.start_date || ""}"></div>
      </div>
      <div class="field"><label>Descripción</label><textarea name="description">${project?.description || ""}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    const { error } = isEdit
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Proyecto actualizado." : "Proyecto creado.");
    loadAll();
  });
}

async function deleteProject(id) {
  if (!confirm("¿Borrar este proyecto? Los movimientos asociados quedan sin proyecto.")) return;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast("Proyecto borrado.");
  loadAll();
}

// ---------- movimientos ----------
function renderProyectoFiltroOptions() {
  const select = document.getElementById("filtro-proyecto-mov");
  const current = select.value;
  select.innerHTML =
    `<option value="">Todos los proyectos</option>` +
    state.projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  select.value = current;
}

function renderMovimientos() {
  const tipo = document.getElementById("filtro-tipo-mov").value;
  const proyecto = document.getElementById("filtro-proyecto-mov").value;
  const list = state.transactions.filter(
    (t) => (!tipo || t.type === tipo) && (!proyecto || t.project_id === proyecto)
  );
  const body = document.getElementById("tabla-movimientos");
  body.innerHTML = list
    .map((t) => {
      const proyectoNombre = state.projects.find((p) => p.id === t.project_id)?.name || "—";
      return `<tr>
      <td class="mono">${dateFmt(t.date)}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td class="dim">${t.category || "—"}</td>
      <td class="dim">${proyectoNombre}</td>
      <td>${t.description || "—"}</td>
      <td class="mono">${money(t.amount)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-mov="${t.id}">Editar</button>
        <button class="icon-btn danger" data-del-mov="${t.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-movimientos").hidden = list.length > 0;
}

document.getElementById("filtro-tipo-mov").addEventListener("change", renderMovimientos);
document.getElementById("filtro-proyecto-mov").addEventListener("change", renderMovimientos);

document.getElementById("tabla-movimientos").addEventListener("click", (e) => {
  const editId = e.target.dataset.editMov;
  const delId = e.target.dataset.delMov;
  if (editId) openMovModal(state.transactions.find((t) => t.id === editId));
  if (delId) deleteMov(delId);
});

document.getElementById("btn-nuevo-mov").addEventListener("click", () => openMovModal());

function openMovModal(mov) {
  const isEdit = !!mov;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar movimiento" : "Nuevo movimiento"}</h3>
    <form id="mov-form">
      <div class="field-row">
        <div class="field"><label>Tipo</label>
          <select name="type">
            <option value="ingreso" ${mov?.type === "ingreso" ? "selected" : ""}>Ingreso</option>
            <option value="egreso" ${mov?.type === "egreso" ? "selected" : ""}>Egreso</option>
          </select>
        </div>
        <div class="field"><label>Monto (ARS)</label><input type="number" step="0.01" min="0.01" name="amount" required value="${mov?.amount || ""}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Fecha</label><input type="date" name="date" required value="${mov?.date || new Date().toISOString().slice(0, 10)}"></div>
        <div class="field"><label>Categoría</label>
          <select name="category">
            <option value="">—</option>
            ${CATEGORIAS.map((c) => `<option value="${c}" ${mov?.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field"><label>Proyecto (opcional)</label>
        <select name="project_id">
          <option value="">—</option>
          ${state.projects.map((p) => `<option value="${p.id}" ${mov?.project_id === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Descripción</label><textarea name="description">${mov?.description || ""}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#mov-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.project_id) payload.project_id = null;
    const { error } = isEdit
      ? await supabase.from("transactions").update(payload).eq("id", mov.id)
      : await supabase.from("transactions").insert(payload);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Movimiento actualizado." : "Movimiento creado.");
    loadAll();
  });
}

async function deleteMov(id) {
  if (!confirm("¿Borrar este movimiento?")) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast("Movimiento borrado.");
  loadAll();
}

// ---------- modal / toast helpers ----------
function buildModal(innerHtml) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "active-modal";
  backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.dataset.close !== undefined) closeModal();
  });
  document.body.appendChild(backdrop);
  return backdrop;
}
function closeModal() {
  document.getElementById("active-modal")?.remove();
}
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

checkSession();
