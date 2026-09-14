// Conexión con Supabase y el cifrado de la entrada rápida con PIN.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";

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
export const SESION_KEY = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`; // la misma que usa Supabase por defecto
export const PIN_KEY = "bc-panel-pin";
export const PIN_CLAVE_KEY = "bc-panel-pin-clave";
export const PIN_INTENTOS = 5;

export const leerPin = () => {
  try { return JSON.parse(localStorage.getItem(PIN_KEY)); } catch { return null; }
};
export const conPin = () => Boolean(leerPin());
const almacen = {
  getItem: (k) => (conPin() ? sessionStorage : localStorage).getItem(k),
  setItem: (k, v) => (conPin() ? sessionStorage : localStorage).setItem(k, v),
  removeItem: (k) => { sessionStorage.removeItem(k); localStorage.removeItem(k); },
};

const aB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function derivarClave(pin, sal) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: 310000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
}

// Si la pestaña ya estaba desbloqueada (recargaste la página), la clave sigue en sessionStorage.
let clavePin = null;
export const clavePinLista = (async () => {
  const cruda = sessionStorage.getItem(PIN_CLAVE_KEY);
  if (cruda && conPin()) clavePin = await crypto.subtle.importKey("raw", deB64(cruda), "AES-GCM", true, ["encrypt", "decrypt"]);
})().catch(() => {});

export async function recordarClave(clave) {
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

export const supabase = createClient(supabaseUrl, configOk ? anonKey : "placeholder-anon-key", {
  auth: { storage: almacen, storageKey: SESION_KEY },
});
supabase.auth.onAuthStateChange((_evento, sesion) => {
  // Fuera del callback: Supabase recomienda no hacer trabajo async adentro.
  if (sesion?.refresh_token && conPin()) setTimeout(() => guardarSesionCifrada(sesion.refresh_token), 0);
});

export async function activarPin(pin) {
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
export function desactivarPin() {
  const actual = sessionStorage.getItem(SESION_KEY);
  localStorage.removeItem(PIN_KEY);
  sessionStorage.removeItem(PIN_CLAVE_KEY);
  clavePin = null;
  if (actual) localStorage.setItem(SESION_KEY, actual);
}
