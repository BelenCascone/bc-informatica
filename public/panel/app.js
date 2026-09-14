import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { plantilla, pendientes, calcularTotales, documentoHTML } from "/panel/presupuesto-doc.js";

const { url, anonKey } = window.SUPABASE_CONFIG || {};
const configOk = Boolean(url && anonKey && !url.includes("PEGA_ACA") && !anonKey.includes("PEGA_ACA"));
if (!configOk) {
  document.getElementById("login-error").hidden = false;
  document.getElementById("login-error").textContent =
    "Falta configurar panel/config.js con la URL y la anon key de Supabase.";
  document.getElementById("login-btn").disabled = true;
}
const supabaseUrl = configOk ? url : "https://placeholder.supabase.co";

// ---------- entrada rápida con PIN ----------
// Sin PIN, la sesión queda guardada en el navegador como siempre (localStorage).
// Con PIN, la sesión abierta vive sólo en la pestaña (sessionStorage) y en el dispositivo
// queda guardado el token de sesión cifrado con una clave que sale del PIN: sin el PIN no sirve.
const SESION_KEY = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`; // la misma que usa Supabase por defecto
const PIN_KEY = "bc-panel-pin";
const PIN_CLAVE_KEY = "bc-panel-pin-clave";
const PIN_INTENTOS = 5;

const leerPin = () => {
  try { return JSON.parse(localStorage.getItem(PIN_KEY)); } catch { return null; }
};
const conPin = () => Boolean(leerPin());
const almacen = {
  getItem: (k) => (conPin() ? sessionStorage : localStorage).getItem(k),
  setItem: (k, v) => (conPin() ? sessionStorage : localStorage).setItem(k, v),
  removeItem: (k) => { sessionStorage.removeItem(k); localStorage.removeItem(k); },
};

const aB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivarClave(pin, sal) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: 310000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
}

// Si la pestaña ya estaba desbloqueada (recargaste la página), la clave sigue en sessionStorage.
let clavePin = null;
const clavePinLista = (async () => {
  const cruda = sessionStorage.getItem(PIN_CLAVE_KEY);
  if (cruda && conPin()) clavePin = await crypto.subtle.importKey("raw", deB64(cruda), "AES-GCM", true, ["encrypt", "decrypt"]);
})().catch(() => {});

async function recordarClave(clave) {
  clavePin = clave;
  sessionStorage.setItem(PIN_CLAVE_KEY, aB64(await crypto.subtle.exportKey("raw", clave)));
}

// Supabase renueva el token cada tanto: cada renovación se vuelve a guardar cifrada.
async function guardarSesionCifrada(refreshToken) {
  await clavePinLista;
  const reg = leerPin();
  if (!reg || !clavePin || !refreshToken) return;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clavePin, new TextEncoder().encode(refreshToken));
  localStorage.setItem(PIN_KEY, JSON.stringify({ ...reg, iv: aB64(iv), data: aB64(data), intentos: 0 }));
}

const supabase = createClient(supabaseUrl, configOk ? anonKey : "placeholder-anon-key", {
  auth: { storage: almacen, storageKey: SESION_KEY },
});
supabase.auth.onAuthStateChange((_evento, sesion) => {
  // Fuera del callback: Supabase recomienda no hacer trabajo async adentro.
  if (sesion?.refresh_token && conPin()) setTimeout(() => guardarSesionCifrada(sesion.refresh_token), 0);
});

async function activarPin(pin) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const clave = await derivarClave(pin, sal);
  const actual = localStorage.getItem(SESION_KEY);
  if (actual) sessionStorage.setItem(SESION_KEY, actual);
  localStorage.setItem(PIN_KEY, JSON.stringify({ sal: aB64(sal), largo: pin.length, intentos: 0 }));
  localStorage.removeItem(SESION_KEY);
  await recordarClave(clave);
  await guardarSesionCifrada(session.refresh_token);
  return true;
}

// Vuelve a como era antes: si hay una sesión abierta en esta pestaña, queda guardada en el navegador.
function desactivarPin() {
  const actual = sessionStorage.getItem(SESION_KEY);
  localStorage.removeItem(PIN_KEY);
  sessionStorage.removeItem(PIN_CLAVE_KEY);
  clavePin = null;
  if (actual) localStorage.setItem(SESION_KEY, actual);
}

async function entrarConPin(pin) {
  const reg = leerPin();
  if (!reg?.data) return showLogin();
  let token;
  try {
    const clave = await derivarClave(pin, deB64(reg.sal));
    const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(reg.iv) }, clave, deB64(reg.data));
    token = new TextDecoder().decode(plano);
    await recordarClave(clave);
  } catch {
    const intentos = (reg.intentos || 0) + 1;
    if (intentos >= PIN_INTENTOS) {
      desactivarPin();
      return showLogin(`${PIN_INTENTOS} intentos fallidos: entrá con tu contraseña y elegí un PIN nuevo.`);
    }
    localStorage.setItem(PIN_KEY, JSON.stringify({ ...reg, intentos }));
    const quedan = PIN_INTENTOS - intentos;
    return errorPin(`PIN incorrecto. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.`);
  }
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });
  if (error || !data.session) {
    // 4xx: Supabase ya no reconoce la sesión (por ejemplo, cerraste sesión en otro lado).
    if (error?.status && error.status < 500) {
      desactivarPin();
      return showLogin("La entrada rápida venció. Entrá con tu contraseña y activala de nuevo.");
    }
    return errorPin("No pude conectar con Supabase. Revisá internet y probá de nuevo.");
  }
  state.user = data.session.user;
  showApp();
}

const CATEGORIAS = ["service", "sistemas", "clases", "asesoria", "otros"];
const money = (n) =>
  Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dateFmt = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

let state = {
  projects: [], transactions: [], user: null, chart: null,
  priceItems: [], quotes: [], preciosOk: true, docOk: true,
  ipc: [], dolarMep: null, mercadoCargado: false,
};

// ---------- auth ----------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const pinForm = document.getElementById("pin-form");
const pinInput = document.getElementById("pin");

async function checkSession() {
  await clavePinLista;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    state.user = session.user;
    showApp();
  } else {
    showLogin();
  }
}

function showLogin(mensaje) {
  loginView.style.display = "flex";
  appView.style.display = "none";
  const hayPin = Boolean(leerPin()?.data);
  pinForm.hidden = !hayPin;
  loginForm.hidden = hayPin;
  document.getElementById("pin-error").hidden = true;
  const errEl = document.getElementById("login-error");
  errEl.hidden = !mensaje;
  if (mensaje) errEl.textContent = mensaje;
  if (hayPin) {
    pinInput.value = "";
    pinInput.focus();
  }
}

function errorPin(msg) {
  const el = document.getElementById("pin-error");
  el.textContent = msg;
  el.hidden = false;
  pinInput.value = "";
  pinInput.focus();
}

function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  document.getElementById("user-email").textContent = state.user?.email || "";
  renderBotonesSesion();
  loadAll();
  if (!state.mercadoCargado) loadMercado();
}

function renderBotonesSesion() {
  const pin = conPin();
  document.getElementById("logout-btn").textContent = pin ? "Bloquear" : "Salir";
  document.getElementById("logout-btn").title = pin ? "Cierra el panel en esta pestaña; volvés a entrar con tu PIN" : "";
  document.getElementById("pin-toggle-btn").textContent = pin ? "Quitar PIN" : "Activar PIN";
}

loginForm.addEventListener("submit", async (e) => {
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
  if (document.getElementById("login-pin").checked) openPinModal();
});

pinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pin = pinInput.value.trim();
  if (!/^\d{4,6}$/.test(pin)) return errorPin("El PIN tiene de 4 a 6 números.");
  const btn = document.getElementById("pin-btn");
  btn.disabled = true;
  btn.textContent = "Entrando...";
  await entrarConPin(pin);
  btn.disabled = false;
  btn.textContent = "Entrar";
});
// Al completar los números del PIN entra solo, sin tener que tocar el botón.
pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "");
  if (pinInput.value.length === leerPin()?.largo) pinForm.requestSubmit();
});
document.getElementById("pin-olvido").addEventListener("click", () => {
  desactivarPin();
  showLogin();
  document.getElementById("email").focus();
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  if (conPin()) {
    // Bloquear: se borra la sesión de esta pestaña; la guardada con el PIN sigue sirviendo.
    sessionStorage.removeItem(SESION_KEY);
    sessionStorage.removeItem(PIN_CLAVE_KEY);
    location.reload();
    return;
  }
  await supabase.auth.signOut();
  state.user = null;
  showLogin();
});

document.getElementById("pin-toggle-btn").addEventListener("click", () => {
  if (!conPin()) return openPinModal();
  if (!confirm("¿Quitar el PIN? El panel va a quedar abierto en este navegador hasta que toques Salir.")) return;
  desactivarPin();
  renderBotonesSesion();
  toast("PIN quitado.");
});

function openPinModal() {
  const modal = buildModal(`
    <h3>Entrada rápida con PIN</h3>
    <p class="dim" style="font-size:13.5px;margin:-6px 0 16px">Elegí un PIN de 4 a 6 números. La próxima vez que abras el panel
    en este dispositivo, entrás sólo con el PIN, sin email ni contraseña.</p>
    <form id="pin-nuevo-form">
      <div class="field-row">
        <div class="field"><label>PIN</label><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" required autocomplete="off"></div>
        <div class="field"><label>Repetilo</label><input name="pin2" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" required autocomplete="off"></div>
      </div>
      <p class="error-msg" id="pin-nuevo-error" hidden></p>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Ahora no</button>
        <button type="submit" class="btn btn--primary">Activar</button>
      </div>
    </form>
  `);
  const form = modal.querySelector("#pin-nuevo-form");
  form.pin.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = modal.querySelector("#pin-nuevo-error");
    if (!/^\d{4,6}$/.test(form.pin.value)) { err.textContent = "Tienen que ser de 4 a 6 números."; err.hidden = false; return; }
    if (form.pin.value !== form.pin2.value) { err.textContent = "Los dos PIN no coinciden."; err.hidden = false; return; }
    const ok = await activarPin(form.pin.value);
    if (!ok) { err.textContent = "No hay una sesión abierta: entrá de nuevo y probá otra vez."; err.hidden = false; return; }
    closeModal();
    renderBotonesSesion();
    toast("Listo: la próxima vez entrás con tu PIN.");
  });
}

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
  // Si todavía no se corrió supabase/presupuestos-pdf.sql, los presupuestos vienen sin la columna "doc".
  if (state.quotes.length) state.docOk = "doc" in state.quotes[0];
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
        <div class="field"><label>Fecha</label><input type="date" name="date" required value="${mov?.date || hoyISO()}"></div>
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
// Fecha local: toISOString() da la de UTC, que después de las 21 en Argentina ya es mañana.
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
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
      <td>${esc(q.title)}<div class="dim" style="font-size:12px">${q.doc?.numero ? `Nº ${esc(q.doc.numero)} · ` : ""}${CATEGORIAS_PRECIO[q.category] || ""}${q.publishable ? " · caso para la landing" : ""}</div></td>
      <td class="dim">${esc(q.client_name) || "—"}</td>
      <td class="mono">${money(q.final_price)}${Number(q.list_price) > Number(q.final_price) ? `<div class="dim" style="font-size:11.5px">lista ${money(q.list_price)}</div>` : ""}</td>
      <td>${ph ? `<span class="pill ${phCls}">${money(ph)}/h</span>` : '<span class="dim">—</span>'}</td>
      <td><span class="badge ${q.status}">${q.status}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-pdf-presu="${q.id}">PDF</button>
        <button class="icon-btn" data-edit-presu="${q.id}">Ver / editar</button>
        <button class="icon-btn danger" data-del-presu="${q.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-presupuestos").hidden = list.length > 0 || !state.preciosOk;
  document.getElementById("presu-doc-setup").hidden = state.docOk || !state.preciosOk;
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
  const { editPresu, delPresu, pdfPresu } = e.target.dataset;
  if (editPresu) openPresuModal(state.quotes.find((q) => q.id === editPresu));
  if (pdfPresu) {
    const q = state.quotes.find((x) => x.id === pdfPresu);
    abrirDocumento(q, docDe(q));
  }
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

// ---------- presupuesto para el cliente ----------
const sumarDias = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Nº correlativo por año: 2026-001, 2026-002…
function siguienteNumero(fecha) {
  const anio = (fecha || hoyISO()).slice(0, 4);
  const usados = state.quotes
    .map((q) => q.doc?.numero)
    .filter((n) => n?.startsWith(anio + "-"))
    .map((n) => parseInt(n.slice(5), 10) || 0);
  const delAnio = state.quotes.filter((q) => q.date?.startsWith(anio)).length;
  return `${anio}-${String(Math.max(delAnio, ...usados) + 1).padStart(3, "0")}`;
}

// El contenido del documento de un presupuesto. Los que se cargaron antes de que existiera el PDF
// arrancan con la plantilla de su categoría y un renglón con el precio que tenían.
function docDe(q) {
  if (q?.doc) return { items: [], ...q.doc };
  const cat = q?.category || "service";
  const t = plantilla(cat);
  const fecha = q?.date || hoyISO();
  const doc = {
    numero: siguienteNumero(fecha),
    valida_hasta: sumarDias(fecha, t.validez_dias),
    situacion: "",
    propuesta_intro: t.propuesta_intro,
    no_incluye: t.no_incluye,
    plazos: t.plazos,
    condiciones: t.condiciones,
    cierre: t.cierre,
    abono_monto: null,
    abono_incluye: t.abono_incluye,
    descuento_tipo: "pct",
    descuento: 0,
    descuento_motivo: "",
    items: [],
  };
  if (q) {
    const lista = Number(q.list_price) || Number(q.final_price) || 0;
    doc.items = [{ concepto: q.title, detalle: "", cant: 1, precio: lista }];
    if (lista > Number(q.final_price)) Object.assign(doc, { descuento_tipo: "monto", descuento: lista - Number(q.final_price) });
  }
  return doc;
}

function abrirDocumento(q, doc, ventana = window.open("", "_blank")) {
  if (!ventana) return toast("El navegador bloqueó la pestaña nueva: permití las ventanas emergentes para este sitio.");
  ventana.document.open();
  ventana.document.write(documentoHTML(q, doc));
  ventana.document.close();
}

const faltaColumnaDoc = (err) => err && (err.code === "PGRST204" || (/'doc'/.test(err.message) && /column/i.test(err.message)));

function openPresuModal(q) {
  const isEdit = !!q;
  const doc = docDe(q);
  const includes = isEdit ? q.includes || "" : plantilla(q?.category || "service").includes;
  const presu = (k) => esc(doc[k] ?? "");
  const opcionesLista = Object.entries(CATEGORIAS_PRECIO)
    .map(([cat, nombre]) => {
      const items = state.priceItems.filter((p) => p.category === cat);
      return items.length
        ? `<optgroup label="${nombre}">${items.map((p) => `<option value="${p.id}">${esc(p.name)} · ${money(p.price)} por ${esc(p.unit)}</option>`).join("")}</optgroup>`
        : "";
    })
    .join("");

  const modal = buildModal(`
    <h3>${isEdit ? "Presupuesto" : "Nuevo presupuesto"}</h3>
    <form id="presu-form" novalidate>
      <p class="form-sec">// Datos</p>
      <div class="field"><label>Trabajo (es el título del PDF)</label><input name="title" required value="${esc(q?.title)}" placeholder="Ej.: Notebook Lenovo: SSD + RAM + Windows"></div>
      <div class="field-row">
        <div class="field"><label>Cliente</label><input name="client_name" value="${esc(q?.client_name)}"></div>
        <div class="field"><label>Categoría</label>
          <select name="category">${opciones(Object.keys(CATEGORIAS_PRECIO), q?.category || "service", (k) => CATEGORIAS_PRECIO[k])}</select></div>
      </div>
      <div class="field-row field-row--4">
        <div class="field"><label>Nº</label><input name="d_numero" value="${presu("numero")}"></div>
        <div class="field"><label>Fecha</label><input type="date" name="date" required value="${q?.date || hoyISO()}"></div>
        <div class="field"><label>Válido hasta</label><input type="date" name="d_valida_hasta" value="${presu("valida_hasta")}"></div>
        <div class="field"><label>Estado</label><select name="status">${opciones(ESTADOS_PRESU, q?.status || "borrador")}</select></div>
      </div>
      <div class="field"><label>Proyecto (opcional)</label>
        <select name="project_id"><option value="">—</option>
          ${state.projects.map((p) => `<option value="${p.id}" ${q?.project_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
        </select></div>

      <p class="form-sec">// Lo que lee el cliente</p>
      <p class="form-ayuda">Viene cargado según la categoría: cambiá lo que haga falta. En las listas va una cosa por renglón;
      si escribís <b>Título: detalle</b>, el título sale en negrita. Lo que está entre [corchetes] es para completar.
      Las secciones que dejes vacías no salen en el PDF.</p>
      <div class="field"><label>Qué me contaste</label><textarea name="d_situacion" rows="3" placeholder="El problema contado como te lo contó el cliente.">${presu("situacion")}</textarea></div>
      <div class="field"><label>Qué te propongo · introducción</label><input name="d_propuesta_intro" value="${presu("propuesta_intro")}"></div>
      <div class="field"><label>Qué te propongo · qué incluye</label><textarea name="includes" rows="5">${esc(includes)}</textarea></div>
      <div class="field"><label>Qué no incluye</label><textarea name="d_no_incluye" rows="3">${presu("no_incluye")}</textarea></div>
      <div class="field"><label>Plazos (Etapa: cuándo)</label><textarea name="d_plazos" rows="2">${presu("plazos")}</textarea></div>

      <p class="form-sec">// Precio</p>
      <div class="items" id="presu-items"></div>
      <div class="items-add">
        <select id="presu-agregar"><option value="">+ Agregar de tu lista de precios…</option>${opcionesLista}</select>
        <button type="button" class="btn btn--ghost" id="presu-renglon">+ Renglón en blanco</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Descuento</label>
          <div class="descuento">
            <input type="number" step="any" min="0" name="d_descuento" value="${doc.descuento || ""}" placeholder="0">
            <select name="d_descuento_tipo" aria-label="Tipo de descuento">${opciones(["pct", "monto"], doc.descuento_tipo || "pct", (v) => (v === "pct" ? "%" : "$"))}</select>
          </div></div>
        <div class="field"><label>Motivo del descuento</label><input name="d_descuento_motivo" value="${presu("descuento_motivo")}" placeholder="Ej.: por pago de contado"></div>
      </div>
      <div class="totales" id="presu-totales"></div>
      <div class="ref-hint" id="presu-refs"></div>
      <div class="field-row">
        <div class="field"><label>Abono mensual (opcional)</label><input type="number" step="1" min="0" name="d_abono_monto" value="${doc.abono_monto ?? ""}" placeholder="vacío = no lleva abono"></div>
        <div class="field"><label>Qué incluye el abono</label><textarea name="d_abono_incluye" rows="2">${presu("abono_incluye")}</textarea></div>
      </div>

      <p class="form-sec">// Condiciones y cierre</p>
      <div class="field"><label>Condiciones (Título: detalle)</label><textarea name="d_condiciones" rows="4">${presu("condiciones")}</textarea></div>
      <div class="field"><label>Texto del cierre (debajo de “¿Arrancamos?”)</label><textarea name="d_cierre" rows="2">${presu("cierre")}</textarea></div>

      <details class="interno">
        <summary>// Sólo para vos: horas, repuestos y por qué este precio (no sale en el PDF)</summary>
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
        <div class="field"><label>Por qué llegué a este precio</label><textarea name="reasoning" rows="3">${esc(q?.reasoning)}</textarea></div>
        <label class="check"><input type="checkbox" name="publishable" ${q?.publishable ? "checked" : ""}> Se puede contar como caso en la landing (sin datos del cliente)</label>
      </details>

      <div class="actions actions--sticky">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--ghost" data-pdf="0">Guardar</button>
        <button type="submit" class="btn btn--primary" data-pdf="1">Guardar y generar PDF</button>
      </div>
    </form>
  `, { wide: "doc" });

  const form = modal.querySelector("#presu-form");
  const itemsEl = modal.querySelector("#presu-items");
  const totalesEl = modal.querySelector("#presu-totales");
  const refsEl = modal.querySelector("#presu-refs");
  const calcEl = modal.querySelector("#presu-calc");
  let items = doc.items.map((it) => ({ ...it }));

  const totales = () => calcularTotales({ items, descuento: num(form.d_descuento.value), descuento_tipo: form.d_descuento_tipo.value });

  const renderItems = () => {
    itemsEl.innerHTML = items.length
      ? items
          .map(
            (it, i) => `<div class="item-row" data-i="${i}">
          <input data-k="concepto" placeholder="Concepto" value="${esc(it.concepto)}">
          <input data-k="detalle" placeholder="Detalle (opcional)" value="${esc(it.detalle)}">
          <input data-k="cant" type="number" step="0.5" min="0" value="${it.cant ?? 1}" title="Cantidad" aria-label="Cantidad">
          <input data-k="precio" type="number" step="1" min="0" value="${it.precio ?? ""}" placeholder="Precio" aria-label="Precio unitario">
          <span class="importe mono">${money((Number(it.cant) || 0) * (Number(it.precio) || 0))}</span>
          <button type="button" class="icon-btn danger" data-quitar="${i}" aria-label="Quitar renglón">✕</button>
        </div>`
          )
          .join("")
      : '<p class="dim items-vacio">Sumá lo que vas a cobrar: elegilo de tu lista de precios o agregá un renglón en blanco.</p>';
  };

  const actualizarTotales = () => {
    const { subtotal, descuento, total } = totales();
    totalesEl.innerHTML =
      (descuento ? `<span>Valor de lista <b>${money(subtotal)}</b></span><span>Descuento <b>− ${money(descuento)}</b></span>` : "") +
      `<span class="total">Total <b>${money(total)}</b></span>`;
  };

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

    const { subtotal, total } = totales();
    const reales = num(form.hours_real.value);
    const partes = [];
    if (subtotal && total < subtotal) partes.push(`descuento ${fmtPct(1 - total / subtotal)}`);
    if (total && reales) partes.push(`<b>${money(total / reales)}</b> por hora real`);
    else if (total && estim) partes.push(`${money(total / estim)} por hora estimada`);
    calcEl.innerHTML = partes.join(" · ");
  };

  itemsEl.addEventListener("input", (e) => {
    const fila = e.target.closest(".item-row");
    if (!fila) return;
    const it = items[fila.dataset.i];
    const k = e.target.dataset.k;
    it[k] = k === "cant" || k === "precio" ? num(e.target.value) : e.target.value;
    fila.querySelector(".importe").textContent = money((Number(it.cant) || 0) * (Number(it.precio) || 0));
    actualizarTotales();
  });
  itemsEl.addEventListener("click", (e) => {
    const i = e.target.dataset.quitar;
    if (i === undefined) return;
    items.splice(Number(i), 1);
    renderItems();
    actualizarTotales();
    actualizarAyuda();
  });
  modal.querySelector("#presu-agregar").addEventListener("change", (e) => {
    const p = state.priceItems.find((x) => x.id === e.target.value);
    e.target.value = "";
    if (!p) return;
    items.push({ concepto: p.name, detalle: "", cant: 1, precio: Number(p.price) });
    renderItems();
    actualizarTotales();
    actualizarAyuda();
  });
  modal.querySelector("#presu-renglon").addEventListener("click", () => {
    items.push({ concepto: "", detalle: "", cant: 1, precio: null });
    renderItems();
    itemsEl.querySelector(".item-row:last-child input").focus();
  });

  // Al cambiar la categoría, los textos que seguían como venían de la plantilla se cambian por los de la nueva.
  let base = plantilla(form.category.value);
  const CAMPOS_PLANTILLA = { d_propuesta_intro: "propuesta_intro", includes: "includes", d_no_incluye: "no_incluye",
    d_plazos: "plazos", d_condiciones: "condiciones", d_abono_incluye: "abono_incluye", d_cierre: "cierre" };
  form.category.addEventListener("change", () => {
    const nueva = plantilla(form.category.value);
    for (const [campo, clave] of Object.entries(CAMPOS_PLANTILLA)) {
      const v = form[campo].value.trim();
      if (!v || v === base[clave].trim()) form[campo].value = nueva[clave];
    }
    const fecha = form.date.value || hoyISO();
    if (!form.d_valida_hasta.value || form.d_valida_hasta.value === sumarDias(fecha, base.validez_dias)) {
      form.d_valida_hasta.value = sumarDias(fecha, nueva.validez_dias);
    }
    base = nueva;
  });
  form.date.addEventListener("change", () => {
    if (!isEdit && form.date.value) form.d_valida_hasta.value = sumarDias(form.date.value, base.validez_dias);
  });

  form.addEventListener("input", () => {
    actualizarTotales();
    actualizarAyuda();
  });
  renderItems();
  actualizarTotales();
  actualizarAyuda();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const conPdf = e.submitter?.dataset.pdf === "1";
    if (!form.elements.title.value.trim()) {
      form.elements.title.focus();
      return toast("Poné el nombre del trabajo.");
    }
    const fd = new FormData(form);
    const p = {};
    const d = {};
    for (const [k, v] of fd.entries()) (k.startsWith("d_") ? d : p)[k.replace(/^d_/, "")] = typeof v === "string" ? v.trim() : v;
    d.items = items
      .filter((it) => String(it.concepto || "").trim() || Number(it.precio))
      .map((it) => ({ concepto: String(it.concepto || "").trim(), detalle: String(it.detalle || "").trim(), cant: num(it.cant) ?? 1, precio: num(it.precio) ?? 0 }));
    if (!d.items.length) return toast("Agregá al menos un renglón en Precio.");
    d.descuento = num(d.descuento) || 0;
    d.abono_monto = num(d.abono_monto);
    const { subtotal, total } = calcularTotales(d);
    p.list_price = subtotal;
    p.final_price = total;
    for (const k of ["parts_cost", "hours_estimated", "hours_real"]) p[k] = num(p[k]);
    for (const k of ["project_id", "parts_paid_by", "client_name", "includes", "reasoning"]) p[k] = p[k] || null;
    p.publishable = fd.get("publishable") === "on";

    let ventana = null;
    if (conPdf) {
      const faltan = pendientes([p.title, p.includes, ...Object.values(d).filter((v) => typeof v === "string"), ...d.items.map((it) => `${it.concepto} ${it.detalle}`)]);
      if (faltan.length && !confirm(`Quedan partes para completar: ${[...new Set(faltan)].join(", ")}.\n\n¿Generar el PDF igual?`)) return;
      // La pestaña se abre ya, antes de guardar: si se abre después, el navegador la toma como emergente y la bloquea.
      ventana = window.open("", "_blank");
    }

    const guardar = (datos) =>
      isEdit ? supabase.from("quotes").update(datos).eq("id", q.id) : supabase.from("quotes").insert(datos);
    let { error } = await guardar({ ...p, doc: d });
    let sinDoc = false;
    if (faltaColumnaDoc(error)) {
      ({ error } = await guardar(p));
      sinDoc = !error;
      state.docOk = false;
    }
    if (error) {
      ventana?.close();
      return toast("Error: " + error.message);
    }
    closeModal();
    toast(sinDoc
      ? "Guardado, pero sin el texto del PDF: falta correr supabase/presupuestos-pdf.sql."
      : isEdit ? "Presupuesto actualizado." : "Presupuesto guardado.");
    loadAll();
    if (ventana) abrirDocumento(p, d, ventana);
  });
}

// ---------- Excel de respaldo ----------
// Todo lo del panel en un .xlsx: sirve para abrirlo en Excel o subirlo a Google Drive y tener
// una copia por si algún día se pierde algo en Supabase. El resumen mensual y los totales por
// proyecto van con fórmulas, así que si sumás movimientos a mano en la planilla se recalculan solos.
function cargarScript(src, global) {
  if (window[global]) return Promise.resolve(window[global]);
  return new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => ok(window[global]);
    s.onerror = () => mal(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

async function descargarExcel(btn) {
  const textoBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Armando el Excel…";
  try {
    const ExcelJS = await cargarScript("https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js", "ExcelJS");
    const wb = new ExcelJS.Workbook();
    wb.creator = "BC Informática";
    wb.created = new Date();
    wb.calcProperties.fullCalcOnLoad = true;
    const MONEDA = '"$" #,##0';
    const FECHA = "dd/mm/yyyy";
    // En UTC para que Excel no corra la fecha un día por el huso horario.
    const fecha = (iso) => (iso ? new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))) : null);
    const proyecto = (id) => state.projects.find((p) => p.id === id)?.name || "";

    const hoja = (nombre, columnas, filas) => {
      const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = columnas.map(([header, key, width, numFmt]) => ({ header, key, width, style: numFmt ? { numFmt } : {} }));
      filas.forEach((f) => ws.addRow(f));
      const cabecera = ws.getRow(1);
      cabecera.font = { bold: true, color: { argb: "FF121412" } };
      cabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6FF00" } };
      cabecera.numFmt = "General";
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
      return ws;
    };

    // Movimientos, del más viejo al más nuevo. Columnas: A fecha · B tipo · D proyecto · F monto (las usan las fórmulas).
    const movs = [...state.transactions].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const suma = (tipo, filtro) => movs.filter((t) => t.type === tipo && filtro(t)).reduce((s, t) => s + Number(t.amount), 0);

    // Resumen mensual: desde el primer movimiento hasta este mes.
    const meses = [];
    const hoy = new Date();
    const primero = movs[0]?.date ? new Date(+movs[0].date.slice(0, 4), +movs[0].date.slice(5, 7) - 1, 1) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    for (let d = primero; d <= hoy; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    let acumulado = 0;
    hoja("Resumen mensual", [
      ["Mes", "mes", 14, "mmm yyyy"], ["Ingresos", "ingresos", 16, MONEDA], ["Egresos", "egresos", 16, MONEDA],
      ["Balance", "balance", 16, MONEDA], ["Acumulado", "acumulado", 16, MONEDA],
    ], meses.map((m, i) => {
      const r = i + 2;
      const ing = suma("ingreso", (t) => t.date?.startsWith(m));
      const egr = suma("egreso", (t) => t.date?.startsWith(m));
      acumulado += ing - egr;
      const sumaMes = (tipo) => `SUMIFS(Movimientos!$F:$F,Movimientos!$B:$B,"${tipo}",Movimientos!$A:$A,">="&A${r},Movimientos!$A:$A,"<"&EDATE(A${r},1))`;
      return {
        mes: fecha(m + "-01"),
        ingresos: { formula: sumaMes("ingreso"), result: ing },
        egresos: { formula: sumaMes("egreso"), result: egr },
        balance: { formula: `B${r}-C${r}`, result: ing - egr },
        acumulado: { formula: `SUM(D$2:D${r})`, result: acumulado },
      };
    }));

    hoja("Movimientos", [
      ["Fecha", "date", 12, FECHA], ["Tipo", "type", 10], ["Categoría", "category", 12], ["Proyecto", "project", 26],
      ["Descripción", "description", 44], ["Monto", "amount", 14, MONEDA],
    ], movs.map((t) => ({ ...t, date: fecha(t.date), project: proyecto(t.project_id), amount: Number(t.amount) })));

    hoja("Proyectos", [
      ["Nombre", "name", 28], ["Cliente", "client_name", 22], ["Estado", "status", 11], ["Inicio", "start_date", 12, FECHA],
      ["Fin", "end_date", 12, FECHA], ["Descripción", "description", 40], ["Ingresos", "ingresos", 14, MONEDA],
      ["Egresos", "egresos", 14, MONEDA], ["Balance", "balance", 14, MONEDA],
    ], state.projects.map((p, i) => {
      const r = i + 2;
      const ing = suma("ingreso", (t) => t.project_id === p.id);
      const egr = suma("egreso", (t) => t.project_id === p.id);
      const sumaProy = (tipo) => `SUMIFS(Movimientos!$F:$F,Movimientos!$D:$D,A${r},Movimientos!$B:$B,"${tipo}")`;
      return {
        ...p, start_date: fecha(p.start_date), end_date: fecha(p.end_date),
        ingresos: { formula: sumaProy("ingreso"), result: ing },
        egresos: { formula: sumaProy("egreso"), result: egr },
        balance: { formula: `G${r}-H${r}`, result: ing - egr },
      };
    }));

    // Columnas H (precio final) y J (horas reales) las usa la fórmula de "Por hora".
    hoja("Presupuestos", [
      ["Nº", "numero", 10], ["Fecha", "date", 12, FECHA], ["Trabajo", "title", 34], ["Cliente", "client_name", 22],
      ["Categoría", "categoria", 11], ["Estado", "status", 11], ["Precio de lista", "list_price", 15, MONEDA],
      ["Precio final", "final_price", 15, MONEDA], ["Horas estimadas", "hours_estimated", 10], ["Horas reales", "hours_real", 10],
      ["Por hora", "por_hora", 13, MONEDA], ["Repuestos", "parts_cost", 13, MONEDA], ["Los paga", "parts_paid_by", 10],
      ["Válido hasta", "valida_hasta", 12, FECHA], ["Qué incluye", "includes", 50], ["Por qué ese precio", "reasoning", 50],
    ], state.quotes.map((q, i) => {
      const r = i + 2;
      const ph = porHora(q);
      return {
        ...q, numero: q.doc?.numero || "", date: fecha(q.date), categoria: CATEGORIAS_PRECIO[q.category] || q.category,
        list_price: num(q.list_price), final_price: num(q.final_price), hours_estimated: num(q.hours_estimated),
        hours_real: num(q.hours_real), parts_cost: num(q.parts_cost), valida_hasta: fecha(q.doc?.valida_hasta),
        por_hora: { formula: `IF(N(J${r})>0,H${r}/J${r},"")`, result: ph ?? "" },
      };
    }));

    hoja("Precios", [
      ["Servicio", "name", 40], ["Categoría", "categoria", 12], ["Por", "unit", 10], ["Precio", "price", 14, MONEDA],
      ["Último ajuste", "updated_on", 13, FECHA], ["Revisar cada (meses)", "adjust_every_months", 12], ["Notas", "notes", 44],
    ], state.priceItems.map((p) => ({ ...p, categoria: CATEGORIAS_PRECIO[p.category] || p.category, price: Number(p.price), updated_on: fecha(p.updated_on) })));

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BC-Informatica-seguimiento-${hoyISO()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast("Excel descargado.");
  } catch (err) {
    toast("No pude armar el Excel: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = textoBtn;
  }
}
document.querySelectorAll("[data-excel]").forEach((b) => b.addEventListener("click", () => descargarExcel(b)));

// ---------- modal / toast helpers ----------
function buildModal(innerHtml, { wide = false } = {}) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "active-modal";
  backdrop.innerHTML = `<div class="modal${wide === "doc" ? " modal--doc" : wide ? " modal--wide" : ""}">${innerHtml}</div>`;
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
