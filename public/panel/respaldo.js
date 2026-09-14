// ---------- Respaldo en JSON ----------
// Todas las tablas del panel, con todas sus columnas, en un solo archivo. A diferencia del Excel (que
// es para mirar y hacer cuentas), este es la copia fiel: sirve para volver a cargar los datos si algún
// día se pierde algo en Supabase. Se piden a la base en el momento, no se toman de lo que ya está en
// pantalla, porque las tablas del board todavía no se muestran.
import { supabase } from "/panel/conexion.js";
import { faltaTabla } from "/panel/estado.js";
import { hoyISO } from "/panel/formato.js";
import { toast } from "/panel/ui.js";

// Cada tabla con el .sql que la crea (para avisar cuál falta correr).
const TABLAS = [
  ["projects", "001-proyectos-y-movimientos.sql"],
  ["transactions", "001-proyectos-y-movimientos.sql"],
  ["price_items", "002-precios.sql"],
  ["quotes", "002-precios.sql"],
  ["sprints", "004-board.sql"],
  ["tasks", "004-board.sql"],
  ["task_events", "004-board.sql"],
  ["qa_cases", "004-board.sql"],
  ["qa_runs", "004-board.sql"],
  ["bugs", "004-board.sql"],
  ["journal", "004-board.sql"],
];
const POR_PAGINA = 1000; // lo más que devuelve Supabase por pedido

// Trae todas las filas de una tabla, de a páginas. Devuelve null si la tabla no existe.
async function traerTabla(tabla) {
  const filas = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase.from(tabla).select("*").order("id").range(desde, desde + POR_PAGINA - 1);
    if (faltaTabla(error)) return null;
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < POR_PAGINA) return filas;
  }
}

async function descargarRespaldo(btn) {
  const textoBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Armando el respaldo…";
  try {
    const respaldo = { armado: new Date().toISOString(), origen: "BC Informática · panel", tablas: {} };
    const faltan = [];
    for (const [tabla, sql] of TABLAS) {
      const filas = await traerTabla(tabla);
      if (filas) respaldo.tablas[tabla] = filas;
      else faltan.push([tabla, sql]);
    }
    if (faltan.length) respaldo.faltan = faltan.map(([tabla]) => tabla);

    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `BC-Informatica-respaldo-${hoyISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);

    if (!faltan.length) return toast("Respaldo descargado.");
    const archivos = [...new Set(faltan.map(([, sql]) => "supabase/" + sql))].join(" y ");
    toast(`Respaldo descargado sin ${faltan.map(([tabla]) => tabla).join(", ")}: falta correr ${archivos}.`);
  } catch (err) {
    toast("No pude armar el respaldo: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = textoBtn;
  }
}
document.querySelectorAll("[data-respaldo]").forEach((b) => b.addEventListener("click", () => descargarRespaldo(b)));
