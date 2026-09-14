// Ayudantes de los tests del panel.
//
// Los tests corren con el USUARIO DE PRUEBA (PANEL_QA_EMAIL / PANEL_QA_PASSWORD en .env.local),
// nunca con el real. Todo lo que cargan lleva el prefijo "QA · " y la limpieza sólo borra filas con
// ese prefijo: si algún día .env.local apunta a otra cuenta, no se toca nada que no sea de prueba.
import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

export { expect };

const config = readFileSync(new URL("../public/panel/config.js", import.meta.url), "utf8");
export const SUPABASE_URL = config.match(/url:\s*"([^"]+)"/)[1];
export const ANON_KEY = config.match(/anonKey:\s*"([^"]+)"/)[1];
export const SESION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
export const PIN_KEY = "bc-panel-pin";

export const PREFIJO = "QA · ";
export const qa = (texto) => PREFIJO + texto;

// Columna que lleva el prefijo en cada tabla, en el orden en que se borran. task_events y qa_runs no
// tienen texto propio: se van solas al borrar su tarea o su caso de QA.
export const TABLAS = [
  ["journal", "texto"],
  ["bugs", "titulo"],
  ["qa_cases", "titulo"],
  ["tasks", "titulo"],
  ["sprints", "nombre"],
  ["quotes", "title"],
  ["price_items", "name"],
  ["transactions", "description"],
  ["projects", "name"],
];

// Las tablas del board existen desde supabase/004-board.sql. Mientras no se corra, la limpieza y el
// control de arranque las saltean en vez de cortar toda la corrida.
const noExiste = (err) => err.message.includes("PGRST205");
async function siExiste(pedido) {
  try {
    return await pedido();
  } catch (err) {
    if (noExiste(err)) return null;
    throw err;
  }
}

export const EMAIL = process.env.PANEL_QA_EMAIL;
const PASSWORD = process.env.PANEL_QA_PASSWORD;

// ---------- API de Supabase (sin librerías: fetch contra Auth y PostgREST) ----------
export async function iniciarSesionApi() {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan PANEL_QA_EMAIL y PANEL_QA_PASSWORD en .env.local.");
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const cuerpo = await r.json();
  if (!r.ok) throw new Error(`No pude entrar con el usuario de prueba: ${cuerpo.msg || cuerpo.error_description || r.status}`);
  return cuerpo;
}

// La sesión la abre global-setup.js una sola vez por corrida (Supabase limita los logins por hora).
export const sesionCompartida = () => JSON.parse(process.env.PANEL_QA_SESION);

export async function rest(metodo, ruta, cuerpo, token = sesionCompartida().access_token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // missing=default: en una carga de varias filas, el campo que falta en una toma el valor por defecto.
      Prefer: "return=representation,missing=default",
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${ruta}: ${r.status} ${texto}`);
  return texto ? JSON.parse(texto) : null;
}

const conPrefijo = (col) => `${col}=like.${encodeURIComponent(PREFIJO + "*")}`;

// Carga filas directo en la base. El prefijo se agrega solo si falta (y si la tabla tiene dónde).
export async function insertar(tabla, filas) {
  const col = Object.fromEntries(TABLAS)[tabla];
  const lista = (Array.isArray(filas) ? filas : [filas]).map((f) =>
    col ? { ...f, [col]: String(f[col] ?? "").startsWith(PREFIJO) ? f[col] : qa(f[col] ?? "sin nombre") } : f
  );
  const columnas = [...new Set(lista.flatMap(Object.keys))].join(",");
  const creadas = await rest("POST", `${tabla}?columns=${columnas}`, lista);
  return Array.isArray(filas) ? creadas : creadas[0];
}

export const leer = (tabla, filtro = "") => rest("GET", `${tabla}?select=*${filtro ? "&" + filtro : ""}`);

export async function limpiar() {
  for (const [tabla, col] of TABLAS) await siExiste(() => rest("DELETE", `${tabla}?${conPrefijo(col)}`));
}

// Filas de la cuenta que NO son de prueba. Si hay alguna, los tests no arrancan.
export async function filasAjenas() {
  const ajenas = [];
  for (const [tabla, col] of TABLAS) {
    const filas = await siExiste(() => rest("GET", `${tabla}?select=id&or=(${col}.is.null,${col}.not.like.${encodeURIComponent(`"${PREFIJO}*"`)})`));
    if (filas?.length) ajenas.push(`${tabla}: ${filas.length}`);
  }
  return ajenas;
}

// ---------- fechas ----------
// Fecha de hoy en Argentina, igual que hoyISO() del panel.
export function hoyAR(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}
// Primer día del mes, n meses atrás (n = 0 es este mes).
export function mesAtras(n, dia = 1) {
  const [a, m] = hoyAR().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, dia));
  return d.toISOString().slice(0, 10);
}
export function sumarDias(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// Como dateFmt() del panel: 14/9/2026.
export const fechaAR = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${a}`;
};

// ---------- formato ----------
// Como money() del panel. Los textos se comparan con los espacios normalizados.
export const pesos = (n) => (n < 0 ? "-" : "") + "$ " + Math.abs(Math.round(n)).toLocaleString("es-AR");
export const normal = (s) => String(s).replace(/\s+/g, " ").trim();

// ---------- mercado: respuestas fijas de ArgentinaDatos y DolarAPI ----------
// Por defecto: inflación del 2 % en cada uno de los últimos 12 meses publicados (hasta el mes pasado)
// y dólar MEP a $ 1.400.
export function inflacionFija(valor = 2, meses = 12) {
  const lista = [];
  for (let i = meses; i >= 1; i--) lista.push({ fecha: mesAtras(i, 28), valor });
  return lista;
}
export const MERCADO_FIJO = { ipc: inflacionFija(), mep: 1400 };

async function simularMercado(context, { ipc, mep }) {
  await context.route("https://api.argentinadatos.com/**", (route) =>
    ipc ? route.fulfill({ json: ipc, headers: { "Access-Control-Allow-Origin": "*" } }) : route.abort()
  );
  await context.route("https://dolarapi.com/**", (route) =>
    mep ? route.fulfill({ json: { compra: mep - 20, venta: mep, casa: "bolsa" }, headers: { "Access-Control-Allow-Origin": "*" } }) : route.abort()
  );
}

// ---------- test con limpieza y mercado fijo ----------
export const test = base.extend({
  mercado: [MERCADO_FIJO, { option: true }],
  context: async ({ context, mercado }, use) => {
    await simularMercado(context, mercado);
    await use(context);
  },
  limpieza: [
    async ({}, use) => {
      await limpiar();
      await use();
      await limpiar();
    },
    { auto: true },
  ],
});

// ---------- panel ----------
// Deja la sesión guardada en el navegador, como si ya hubieras entrado antes (sin pasar por el login).
// Se guarda una sola vez por contexto: al recargar o abrir otra pestaña manda lo que haya hecho el panel.
// expires_at lejano: el panel no intenta renovarla aunque el test adelante el reloj.
export async function guardarSesion(page, sesion = sesionCompartida()) {
  const valor = JSON.stringify({ ...sesion, expires_at: 4102444800 });
  await page.context().addInitScript(
    ([clave, v]) => {
      if (localStorage.getItem("qa-sesion-guardada")) return;
      localStorage.setItem("qa-sesion-guardada", "1");
      localStorage.setItem(clave, v);
    },
    [SESION_KEY, valor]
  );
}

// En local, "/panel" muestra la landing (y con vite dev también "/panel/"): lo que lo resuelve es
// vercel.json, que sólo corre en Vercel. Por eso los tests entran por el archivo.
export const PANEL = "/panel/index.html";

// Abre el panel ya adentro y espera a que terminen de cargar los datos.
export async function abrirPanel(page, { sesion, ruta = PANEL } = {}) {
  await guardarSesion(page, sesion);
  await page.goto(ruta);
  await esperarDatos(page);
}

// Entra por el formulario, como una persona. Cada uno de estos cuenta para el límite de logins
// de Supabase: se usa sólo en los tests de la entrada.
export async function entrarConContrasena(page, { pin = false, password = PASSWORD } = {}) {
  await page.goto(PANEL);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(password);
  await page.locator("#login-pin").setChecked(pin);
  await page.locator("#login-btn").click();
}

// Activa el PIN desde el botón de arriba, con la sesión ya abierta.
export async function activarPin(page, pin = "1234") {
  await page.locator("#pin-toggle-btn").click();
  await modal(page).locator('input[name="pin"]').fill(pin);
  await modal(page).locator('input[name="pin2"]').fill(pin);
  await modal(page).getByRole("button", { name: "Activar" }).click();
  await expect(page.locator("#logout-btn")).toHaveText("Bloquear");
}

export async function esperarDatos(page) {
  await expect(page.locator("#app-view")).toBeVisible();
  await expect(page.locator("#kpi-activos")).not.toHaveText("—");
}

export async function irA(page, vista) {
  await page.locator(`.tab-btn[data-view="${vista}"]`).click();
  await expect(page.locator(`#view-${vista}`)).toHaveClass(/active/);
}

export const modal = (page) => page.locator("#active-modal");
export const toast = (page) => page.locator("#toast");

export async function esperarToast(page, texto) {
  await expect(toast(page)).toHaveText(texto);
}

// Acepta (o cancela) el próximo confirm() y devuelve el texto de la pregunta.
export function responderConfirm(page, aceptar = true) {
  return new Promise((ok) => {
    page.once("dialog", async (d) => {
      const msg = d.message();
      await (aceptar ? d.accept() : d.dismiss());
      ok(msg);
    });
  });
}

// Filas de una tabla del panel: el texto de cada celda tal como está en el HTML (sin las mayúsculas
// que pone el CSS), con los espacios normalizados. Lo que va en otro renglón de la celda (un <div>)
// queda separado con " | ".
export async function filas(page, tbodyId) {
  return page.locator(`#${tbodyId} tr`).evaluateAll((trs) =>
    trs.map((tr) =>
      [...tr.querySelectorAll(":scope > td")].map((td) => {
        const partes = [];
        const recorrer = (nodo) => {
          for (const n of nodo.childNodes) {
            if (n.nodeType === 3) partes.push(n.textContent);
            else if (n.tagName === "DIV" && n.parentElement === td) partes.push(" | ", n.textContent);
            else recorrer(n);
          }
        };
        recorrer(td);
        return partes.join("").replace(/\s+/g, " ").replace(/^ \| /, "").trim();
      })
    )
  );
}

// Junta los errores de consola y de página para revisarlos al final del test.
export function juntarErrores(page) {
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(e.message));
  return errores;
}
