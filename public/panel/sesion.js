// Entrada al panel: login con contraseña, entrada rápida con PIN, Bloquear y Salir.
import {
  supabase, SESION_KEY, PIN_KEY, PIN_CLAVE_KEY, PIN_INTENTOS, leerPin, conPin, deB64, derivarClave, clavePinLista,
  recordarClave, activarPin, desactivarPin,
} from "/panel/conexion.js";
import { state } from "/panel/estado.js";
import { buildModal, closeModal, toast } from "/panel/ui.js";

// Lo que hace app.js cuando la sesión queda abierta (cargar los datos).
let alEntrar = () => {};

export function iniciarSesion(entrar) {
  alEntrar = entrar;
  return checkSession();
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
  alEntrar();
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
