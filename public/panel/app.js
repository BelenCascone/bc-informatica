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

let state = {
  projects: [], transactions: [], user: null, chart: null,
  priceItems: [], quotes: [], preciosOk: true,
  ipc: [], dolarMep: null, mercadoCargado: false,
};

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
  if (!state.mercadoCargado) loadMercado();
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
function showView(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
}
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});
document.addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto]");
  if (goto) showView(goto.dataset.goto);
});

// ---------- data loading ----------
async function loadAll() {
  const [
    { data: projects, error: pErr },
    { data: transactions, error: tErr },
    { data: priceItems, error: piErr },
    { data: quotes, error: qErr },
  ] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("price_items").select("*").order("category").order("name"),
    supabase.from("quotes").select("*").order("date", { ascending: false }),
  ]);
  if (pErr) toast("Error cargando proyectos: " + pErr.message);
  if (tErr) toast("Error cargando movimientos: " + tErr.message);
  // Si todavía no se corrió supabase/precios.sql, la pestaña Precios lo avisa en vez de mostrar un error.
  const faltaTabla = (err) => err && (err.code === "42P01" || err.code === "PGRST205" || /does not exist|schema cache/i.test(err.message));
  state.preciosOk = !faltaTabla(piErr) && !faltaTabla(qErr);
  if (piErr && !faltaTabla(piErr)) toast("Error cargando precios: " + piErr.message);
  if (qErr && !faltaTabla(qErr)) toast("Error cargando presupuestos: " + qErr.message);
  state.projects = projects || [];
  state.transactions = transactions || [];
  state.priceItems = priceItems || [];
  state.quotes = quotes || [];
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
  renderPrecios();
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

// ---------- precios ----------
const CATEGORIAS_PRECIO = {
  service: "Service", sistemas: "Sistemas", clases: "Clases", asesoria: "Asesoría", abonos: "Abonos", otros: "Otros",
};
const UNIDADES = ["trabajo", "hora", "mes", "clase", "paquete", "proyecto"];
const ESTADOS_PRESU = ["borrador", "enviado", "aceptado", "rechazado"];
const REFS = window.REFERENCIAS_MERCADO || { revisado: null, items: [] };
const hoyISO = () => new Date().toISOString().slice(0, 10);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtPct = (n) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
const redondear = (n) => Math.round(n / 500) * 500;
const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// Inflación (INDEC, vía ArgentinaDatos) y dólar MEP (DolarAPI). Son APIs públicas con CORS abierto.
// Si alguna no responde, el panel sigue andando: sólo faltan los avisos que dependen de ella.
async function loadMercado() {
  state.mercadoCargado = true;
  const [ipc, mep] = await Promise.allSettled([
    fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch("https://dolarapi.com/v1/dolares/bolsa").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);
  if (ipc.status === "fulfilled" && Array.isArray(ipc.value)) {
    state.ipc = ipc.value
      .filter((x) => x.fecha && typeof x.valor === "number")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  if (mep.status === "fulfilled") state.dolarMep = Number(mep.value?.venta) || null;
  renderPrecios();
}

// Inflación publicada en los meses posteriores al mes de la fecha dada.
// El mes en curso no cuenta: el INDEC lo publica a mitad del mes siguiente.
function inflacionDesde(fecha) {
  if (!state.ipc.length || !fecha) return null;
  const desde = fecha.slice(0, 7);
  const meses = state.ipc.filter((x) => x.fecha.slice(0, 7) > desde);
  return { acum: meses.reduce((f, x) => f * (1 + x.valor / 100), 1) - 1, meses: meses.length };
}

function mesesDesde(fecha) {
  const d = new Date(fecha + "T00:00:00");
  const n = new Date();
  return Math.max(0, (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth()) - (n.getDate() < d.getDate() ? 1 : 0));
}

function rangoEnPesos(ref) {
  if (ref.usdMin != null) {
    if (!state.dolarMep) return null;
    return { min: ref.usdMin * state.dolarMep, max: ref.usdMax * state.dolarMep };
  }
  return { min: ref.min, max: ref.max };
}

function compararConMercado(precio, refKey) {
  const ref = REFS.items.find((r) => r.clave === refKey);
  if (!ref) return null;
  const rango = rangoEnPesos(ref);
  if (!rango) return { ref, rango: null, estado: null };
  if (precio < rango.min) return { ref, rango, estado: "bajo", dif: 1 - precio / rango.min };
  if (precio > rango.max) return { ref, rango, estado: "alto", dif: precio / rango.max - 1 };
  return { ref, rango, estado: "ok", dif: 0 };
}

const fmtRango = (r) => (Math.round(r.min) === Math.round(r.max) ? money(r.min) : `${money(r.min)} – ${money(r.max)}`);

// La tarifa por hora sale de la lista de precios: el primer precio "por hora" de Sistemas.
function tarifaHora() {
  const it = state.priceItems.find((p) => p.unit === "hora" && p.category === "sistemas");
  return it ? Number(it.price) : null;
}

const porHora = (q) => (Number(q.hours_real) > 0 ? Number(q.final_price) / Number(q.hours_real) : null);

function calcularAvisos() {
  const avisos = [];
  for (const p of state.priceItems) {
    const precio = Number(p.price);
    const meses = mesesDesde(p.updated_on);
    const inf = inflacionDesde(p.updated_on);
    if (meses >= p.adjust_every_months || (inf && inf.acum >= 0.05)) {
      const sugerido = inf && inf.acum > 0 ? redondear(precio * (1 + inf.acum)) : null;
      avisos.push({
        tipo: "subir", orden: 1,
        html: `<b>${esc(p.name)}</b> (${money(precio)}): el último ajuste fue hace ${meses} ${meses === 1 ? "mes" : "meses"}` +
          (inf && inf.meses ? ` y la inflación publicada desde entonces suma ${fmtPct(inf.acum)}.` : ".") +
          (sugerido ? ` Precio sugerido: <b>${money(sugerido)}</b>.` : " Toca revisarlo."),
      });
    }
    const cmp = p.ref_key ? compararConMercado(precio, p.ref_key) : null;
    if (cmp?.estado === "bajo") {
      avisos.push({
        tipo: "bajo", orden: 0,
        html: `<b>${esc(p.name)}</b> (${money(precio)}) está ${fmtPct(cmp.dif)} debajo del mínimo del mercado ` +
          `(${money(cmp.rango.min)} · ${esc(cmp.ref.fuente)}, ${esc(cmp.ref.zona)}). Podés subirlo sin salirte del rango.`,
      });
    } else if (cmp?.estado === "alto") {
      avisos.push({
        tipo: "alto", orden: 2,
        html: `<b>${esc(p.name)}</b> (${money(precio)}) está ${fmtPct(cmp.dif)} arriba del máximo del mercado ` +
          `(${money(cmp.rango.max)} · ${esc(cmp.ref.fuente)}, ${esc(cmp.ref.zona)}). Si te rechazan presupuestos, empezá por acá.`,
      });
    }
  }

  const tarifa = tarifaHora();
  for (const q of state.quotes) {
    if (q.status === "rechazado") continue;
    const ph = porHora(q);
    if (tarifa && ph !== null && ph < tarifa) {
      avisos.push({
        tipo: "bajo", orden: 0,
        html: `<b>${esc(q.title)}</b> te quedó a <b>${money(ph)} la hora</b> (${money(q.final_price)} en ${q.hours_real} h), ` +
          `debajo de tu tarifa de ${money(tarifa)}.`,
      });
    }
    if (q.status === "aceptado" && Number(q.list_price) > 0 && Number(q.final_price) < Number(q.list_price) * 0.85) {
      const dto = 1 - Number(q.final_price) / Number(q.list_price);
      avisos.push({
        tipo: "bajo", orden: 1,
        html: `<b>${esc(q.title)}</b>: cobraste ${money(q.final_price)}, ${fmtPct(dto)} menos que tu precio de lista (${money(q.list_price)}).`,
      });
    }
  }

  // Lo que dicen los clientes: muchos rechazos → caro; todo aceptado → probablemente barato.
  const limite = new Date();
  limite.setDate(limite.getDate() - 120);
  for (const [cat, nombre] of Object.entries(CATEGORIAS_PRECIO)) {
    const cerrados = state.quotes.filter(
      (q) => q.category === cat && new Date(q.date + "T00:00:00") >= limite && (q.status === "aceptado" || q.status === "rechazado")
    );
    const rech = cerrados.filter((q) => q.status === "rechazado").length;
    const acep = cerrados.length - rech;
    if (rech >= 2 && rech >= acep) {
      avisos.push({ tipo: "alto", orden: 1, html: `En <b>${nombre}</b> te rechazaron ${rech} de ${cerrados.length} presupuestos en los últimos 4 meses. Puede que el precio esté alto para tu público.` });
    } else if (acep >= 4 && rech === 0) {
      avisos.push({ tipo: "subir", orden: 2, html: `En <b>${nombre}</b> te aceptaron los últimos ${acep} presupuestos sin ningún rechazo. Probablemente tengas margen para subir.` });
    }
  }
  return avisos.sort((a, b) => a.orden - b.orden);
}

const ICONO_AVISO = { subir: "Ajustar", bajo: "Bajo", alto: "Alto", ok: "OK" };
const avisoHtml = (a) => `<li class="aviso ${a.tipo}"><span class="ico">${ICONO_AVISO[a.tipo]}</span><span class="txt">${a.html}</span></li>`;

function renderPrecios() {
  document.getElementById("precios-setup").hidden = state.preciosOk;
  const avisos = state.preciosOk ? calcularAvisos() : [];

  const count = document.getElementById("avisos-count");
  count.textContent = avisos.length;
  count.hidden = avisos.length === 0;
  document.getElementById("lista-avisos").innerHTML = avisos.map(avisoHtml).join("");
  document.getElementById("empty-avisos").hidden = avisos.length > 0 || !state.preciosOk;
  document.getElementById("resumen-avisos").hidden = avisos.length === 0;
  document.getElementById("lista-avisos-resumen").innerHTML = avisos.slice(0, 3).map(avisoHtml).join("");

  renderKpisPrecios();
  renderPresupuestos();
  renderListaPrecios();
  renderReferencias();
}

function renderKpisPrecios() {
  const tarifa = tarifaHora();
  document.getElementById("kpi-tarifa").textContent = tarifa ? money(tarifa) : "—";
  document.getElementById("kpi-tarifa-sub").textContent = tarifa ? "de tu lista de precios" : "cargá un precio por hora en Sistemas";

  const conHoras = state.quotes.filter((q) => q.status !== "rechazado" && Number(q.hours_real) > 0);
  const horas = conHoras.reduce((s, q) => s + Number(q.hours_real), 0);
  const cobrado = conHoras.reduce((s, q) => s + Number(q.final_price), 0);
  const real = horas ? cobrado / horas : null;
  const elReal = document.getElementById("kpi-hora-real");
  elReal.textContent = real ? money(real) : "—";
  elReal.className = "val" + (real && tarifa ? (real >= tarifa ? " pos" : " neg") : "");
  document.getElementById("kpi-hora-real-sub").textContent = conHoras.length
    ? `${conHoras.length} ${conHoras.length === 1 ? "presupuesto" : "presupuestos"} · ${horas} h`
    : "cargá las horas en tus presupuestos";

  const aceptados = state.quotes.filter((q) => q.status === "aceptado");
  const enCurso = state.quotes.filter((q) => q.status === "borrador" || q.status === "enviado");
  document.getElementById("kpi-aceptado").textContent = money(aceptados.reduce((s, q) => s + Number(q.final_price), 0));
  document.getElementById("kpi-aceptado-sub").textContent =
    `${aceptados.length} aceptados · ${enCurso.length} en curso (${money(enCurso.reduce((s, q) => s + Number(q.final_price), 0))})`;

  const ultimo = state.ipc[state.ipc.length - 1];
  document.getElementById("kpi-ipc").textContent = ultimo ? `${String(ultimo.valor).replace(".", ",")}%` : "—";
  const mes = ultimo ? new Date(ultimo.fecha + "T00:00:00").toLocaleDateString("es-AR", { month: "long" }) : null;
  document.getElementById("kpi-dolar").textContent =
    (mes ? `inflación de ${mes}` : state.mercadoCargado ? "sin datos de inflación" : "cargando…") +
    (state.dolarMep ? ` · MEP ${money(state.dolarMep)}` : "");
}

function renderPresupuestos() {
  const filtro = document.getElementById("filtro-estado-presu").value;
  const list = state.quotes.filter((q) => !filtro || q.status === filtro);
  const tarifa = tarifaHora();
  document.getElementById("tabla-presupuestos").innerHTML = list
    .map((q) => {
      const ph = porHora(q);
      const phCls = ph && tarifa ? (ph >= tarifa ? "ok" : "bajo") : "";
      return `<tr>
      <td class="mono">${dateFmt(q.date)}</td>
      <td>${esc(q.title)}<div class="dim" style="font-size:12px">${CATEGORIAS_PRECIO[q.category] || ""}${q.publishable ? " · caso para la landing" : ""}</div></td>
      <td class="dim">${esc(q.client_name) || "—"}</td>
      <td class="mono">${money(q.final_price)}${Number(q.list_price) > Number(q.final_price) ? `<div class="dim" style="font-size:11.5px">lista ${money(q.list_price)}</div>` : ""}</td>
      <td>${ph ? `<span class="pill ${phCls}">${money(ph)}/h</span>` : '<span class="dim">—</span>'}</td>
      <td><span class="badge ${q.status}">${q.status}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-presu="${q.id}">Ver / editar</button>
        <button class="icon-btn danger" data-del-presu="${q.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-presupuestos").hidden = list.length > 0 || !state.preciosOk;
}

function renderListaPrecios() {
  const sel = document.getElementById("filtro-cat-precio");
  if (sel.options.length === 1) {
    sel.insertAdjacentHTML("beforeend", Object.entries(CATEGORIAS_PRECIO).map(([k, v]) => `<option value="${k}">${v}</option>`).join(""));
  }
  const list = state.priceItems.filter((p) => !sel.value || p.category === sel.value);
  document.getElementById("tabla-precios").innerHTML = list
    .map((p) => {
      const precio = Number(p.price);
      const meses = mesesDesde(p.updated_on);
      const inf = inflacionDesde(p.updated_on);
      const toca = meses >= p.adjust_every_months || (inf && inf.acum >= 0.05);
      const sugerido = inf && inf.acum > 0 ? redondear(precio * (1 + inf.acum)) : null;
      const infTxt = !inf
        ? '<span class="dim">—</span>'
        : `<span class="pill ${toca ? "subir" : ""}">${fmtPct(inf.acum)}</span>${sugerido && toca ? `<div class="dim" style="font-size:11.5px">sugerido ${money(sugerido)}</div>` : ""}`;
      const cmp = p.ref_key ? compararConMercado(precio, p.ref_key) : null;
      const cmpTxt = !cmp
        ? '<span class="dim">—</span>'
        : !cmp.rango
          ? '<span class="dim">falta el dólar</span>'
          : `<span class="pill ${cmp.estado}">${{ ok: "en rango", bajo: `${fmtPct(cmp.dif)} abajo`, alto: `${fmtPct(cmp.dif)} arriba` }[cmp.estado]}</span><div class="dim" style="font-size:11.5px">${fmtRango(cmp.rango)}</div>`;
      return `<tr>
      <td>${esc(p.name)}<div class="dim" style="font-size:12px">${CATEGORIAS_PRECIO[p.category] || ""}${p.notes ? " · " + esc(p.notes) : ""}</div></td>
      <td class="mono">${money(precio)}<div class="dim" style="font-size:11.5px">por ${esc(p.unit)}</div></td>
      <td class="mono">${dateFmt(p.updated_on)}<div class="dim" style="font-size:11.5px">${meses === 0 ? "este mes" : `hace ${meses} ${meses === 1 ? "mes" : "meses"}`}</div></td>
      <td>${infTxt}</td>
      <td>${cmpTxt}</td>
      <td><div class="row-actions">
        ${sugerido && toca ? `<button class="icon-btn" data-ajustar-precio="${p.id}" data-sugerido="${sugerido}">Aplicar ${money(sugerido)}</button>` : ""}
        <button class="icon-btn" data-edit-precio="${p.id}">Editar</button>
        <button class="icon-btn danger" data-del-precio="${p.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-precios").hidden = list.length > 0 || !state.preciosOk;
}

function renderReferencias() {
  document.getElementById("ref-revisado").textContent = REFS.revisado ? `revisado el ${dateFmt(REFS.revisado)}` : "";
  document.getElementById("tabla-referencias").innerHTML = REFS.items
    .map((r) => {
      const rango = rangoEnPesos(r);
      const usd = r.usdMin != null ? ` <span class="dim">(USD ${r.usdMin}–${r.usdMax})</span>` : "";
      return `<tr>
      <td>${esc(r.nombre)}<div class="dim" style="font-size:12px">${CATEGORIAS_PRECIO[r.categoria] || ""}${r.nota ? " · " + esc(r.nota) : ""}</div></td>
      <td class="mono">${rango ? fmtRango(rango) : "—"}${usd}<div class="dim" style="font-size:11.5px">por ${esc(r.unidad)}</div></td>
      <td class="dim">${esc(r.zona)}</td>
      <td class="src"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.fuente)}</a><div class="dim" style="font-size:11.5px">${esc(r.fecha)}</div></td>
    </tr>`;
    })
    .join("");
}

document.getElementById("filtro-estado-presu").addEventListener("change", renderPresupuestos);
document.getElementById("filtro-cat-precio").addEventListener("change", renderListaPrecios);
document.getElementById("btn-nuevo-presu").addEventListener("click", () => openPresuModal());
document.getElementById("btn-nuevo-precio").addEventListener("click", () => openPrecioModal());

document.getElementById("tabla-presupuestos").addEventListener("click", (e) => {
  const { editPresu, delPresu } = e.target.dataset;
  if (editPresu) openPresuModal(state.quotes.find((q) => q.id === editPresu));
  if (delPresu) borrar("quotes", delPresu, "¿Borrar este presupuesto?", "Presupuesto borrado.");
});

document.getElementById("tabla-precios").addEventListener("click", async (e) => {
  const { editPrecio, delPrecio, ajustarPrecio, sugerido } = e.target.dataset;
  if (editPrecio) openPrecioModal(state.priceItems.find((p) => p.id === editPrecio));
  if (delPrecio) borrar("price_items", delPrecio, "¿Borrar este precio de la lista?", "Precio borrado.");
  if (ajustarPrecio) {
    if (!confirm(`¿Pasar este precio a ${money(sugerido)} desde hoy?`)) return;
    const { error } = await supabase.from("price_items").update({ price: Number(sugerido), updated_on: hoyISO() }).eq("id", ajustarPrecio);
    if (error) return toast("Error: " + error.message);
    toast("Precio actualizado.");
    loadAll();
  }
});

async function borrar(tabla, id, pregunta, ok) {
  if (!confirm(pregunta)) return;
  const { error } = await supabase.from(tabla).delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast(ok);
  loadAll();
}

const opciones = (valores, actual, etiqueta = (v) => v) =>
  valores.map((v) => `<option value="${v}" ${actual === v ? "selected" : ""}>${etiqueta(v)}</option>`).join("");

function openPrecioModal(item) {
  const isEdit = !!item;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar precio" : "Nuevo precio"}</h3>
    <form id="precio-form">
      <div class="field"><label>Servicio</label><input name="name" required value="${esc(item?.name)}"></div>
      <div class="field-row">
        <div class="field"><label>Categoría</label>
          <select name="category">${opciones(Object.keys(CATEGORIAS_PRECIO), item?.category || "service", (k) => CATEGORIAS_PRECIO[k])}</select></div>
        <div class="field"><label>Por</label><select name="unit">${opciones(UNIDADES, item?.unit || "trabajo")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Precio (ARS)</label><input type="number" step="1" min="0" name="price" required value="${item?.price ?? ""}"></div>
        <div class="field"><label>Último ajuste</label><input type="date" name="updated_on" required value="${item?.updated_on || hoyISO()}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Revisar cada (meses)</label><input type="number" min="1" max="24" name="adjust_every_months" value="${item?.adjust_every_months ?? 3}"></div>
        <div class="field"><label>Comparar con</label>
          <select name="ref_key"><option value="">— sin comparar —</option>
            ${REFS.items.map((r) => `<option value="${r.clave}" ${item?.ref_key === r.clave ? "selected" : ""}>${esc(r.nombre)} (${esc(r.zona)})</option>`).join("")}
          </select></div>
      </div>
      <div class="field"><label>Notas</label><textarea name="notes">${esc(item?.notes)}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#precio-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.target).entries());
    p.price = Number(p.price);
    p.adjust_every_months = Number(p.adjust_every_months) || 3;
    p.ref_key = p.ref_key || null;
    p.notes = p.notes || null;
    // Si cambió el monto y no tocaste la fecha, el ajuste cuenta desde hoy.
    if (isEdit && p.price !== Number(item.price) && p.updated_on === item.updated_on) p.updated_on = hoyISO();
    const { error } = isEdit
      ? await supabase.from("price_items").update(p).eq("id", item.id)
      : await supabase.from("price_items").insert(p);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Precio actualizado." : "Precio agregado.");
    loadAll();
  });
}

function openPresuModal(q) {
  const isEdit = !!q;
  const modal = buildModal(`
    <h3>${isEdit ? "Presupuesto" : "Nuevo presupuesto"}</h3>
    <form id="presu-form">
      <div class="field"><label>Trabajo</label><input name="title" required value="${esc(q?.title)}" placeholder="Ej.: Notebook Lenovo: SSD + RAM + Windows"></div>
      <div class="field-row">
        <div class="field"><label>Cliente</label><input name="client_name" value="${esc(q?.client_name)}"></div>
        <div class="field"><label>Proyecto (opcional)</label>
          <select name="project_id"><option value="">—</option>
            ${state.projects.map((p) => `<option value="${p.id}" ${q?.project_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
          </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Categoría</label>
          <select name="category">${opciones(Object.keys(CATEGORIAS_PRECIO), q?.category || "service", (k) => CATEGORIAS_PRECIO[k])}</select></div>
        <div class="field-row" style="gap:12px">
          <div class="field"><label>Fecha</label><input type="date" name="date" required value="${q?.date || hoyISO()}"></div>
          <div class="field"><label>Estado</label><select name="status">${opciones(ESTADOS_PRESU, q?.status || "borrador")}</select></div>
        </div>
      </div>
      <div class="ref-hint" id="presu-refs"></div>
      <div class="field-row">
        <div class="field"><label>Precio de lista</label><input type="number" step="1" min="0" name="list_price" value="${q?.list_price ?? ""}" placeholder="antes de descuentos"></div>
        <div class="field"><label>Precio final</label><input type="number" step="1" min="0" name="final_price" required value="${q?.final_price ?? ""}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Horas estimadas</label><input type="number" step="0.5" min="0" name="hours_estimated" value="${q?.hours_estimated ?? ""}"></div>
        <div class="field"><label>Horas reales</label><input type="number" step="0.5" min="0" name="hours_real" value="${q?.hours_real ?? ""}"></div>
      </div>
      <p class="calc" id="presu-calc"></p>
      <div class="field-row">
        <div class="field"><label>Repuestos (ARS)</label><input type="number" step="1" min="0" name="parts_cost" value="${q?.parts_cost ?? ""}"></div>
        <div class="field"><label>Los repuestos los paga</label>
          <select name="parts_paid_by"><option value="">—</option>${opciones(["cliente", "yo"], q?.parts_paid_by)}</select></div>
      </div>
      <div class="field"><label>Qué incluí (una cosa por renglón)</label><textarea name="includes" rows="5">${esc(q?.includes)}</textarea></div>
      <div class="field"><label>Por qué llegué a este precio</label><textarea name="reasoning" rows="4">${esc(q?.reasoning)}</textarea></div>
      <label class="check"><input type="checkbox" name="publishable" ${q?.publishable ? "checked" : ""}> Se puede contar como caso en la landing (sin datos del cliente)</label>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `, { wide: true });

  const form = modal.querySelector("#presu-form");
  const refsEl = modal.querySelector("#presu-refs");
  const calcEl = modal.querySelector("#presu-calc");

  // Mientras cargás: qué cobra el mercado en esa categoría y cuánto te queda la hora.
  const actualizarAyuda = () => {
    const cat = form.category.value;
    const tarifa = tarifaHora();
    const refs = REFS.items.filter((r) => r.categoria === cat);
    const estim = num(form.hours_estimated.value);
    const lineas = refs.slice(0, 6).map((r) => {
      const rango = rangoEnPesos(r);
      return `<li><b>${esc(r.nombre)}</b>: ${rango ? fmtRango(rango) : "—"} <span class="dim">(${esc(r.fuente)}, ${esc(r.zona)})</span></li>`;
    });
    refsEl.innerHTML =
      (tarifa && estim ? `Con ${estim} h a tu tarifa de ${money(tarifa)} serían <b>${money(estim * tarifa)}</b>.<br>` : "") +
      (lineas.length ? `Precios de mercado en ${CATEGORIAS_PRECIO[cat]}:<ul>${lineas.join("")}</ul>` : `Sin precios de mercado cargados para ${CATEGORIAS_PRECIO[cat]}.`);

    const lista = num(form.list_price.value);
    const final = num(form.final_price.value);
    const reales = num(form.hours_real.value);
    const partes = [];
    if (lista && final !== null && final < lista) partes.push(`descuento ${fmtPct(1 - final / lista)}`);
    if (final && reales) partes.push(`<b>${money(final / reales)}</b> por hora real`);
    else if (final && estim) partes.push(`${money(final / estim)} por hora estimada`);
    calcEl.innerHTML = partes.join(" · ");
  };
  form.addEventListener("input", actualizarAyuda);
  actualizarAyuda();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const p = Object.fromEntries(fd.entries());
    for (const k of ["list_price", "final_price", "parts_cost", "hours_estimated", "hours_real"]) p[k] = num(p[k]);
    for (const k of ["project_id", "parts_paid_by", "client_name", "includes", "reasoning"]) p[k] = p[k] || null;
    p.publishable = fd.get("publishable") === "on";
    const { error } = isEdit
      ? await supabase.from("quotes").update(p).eq("id", q.id)
      : await supabase.from("quotes").insert(p);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Presupuesto actualizado." : "Presupuesto guardado.");
    loadAll();
  });
}

// ---------- modal / toast helpers ----------
function buildModal(innerHtml, { wide = false } = {}) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "active-modal";
  backdrop.innerHTML = `<div class="modal${wide ? " modal--wide" : ""}">${innerHtml}</div>`;
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
