// Los datos del panel: se cargan todos juntos y, cada vez que cambian, se vuelven a dibujar las vistas.
import { supabase } from "/panel/conexion.js";
import { toast } from "/panel/ui.js";

export const state = {
  projects: [], transactions: [], user: null, chart: null,
  priceItems: [], quotes: [], preciosOk: true, docOk: true,
  ipc: [], dolarMep: null, mercadoCargado: false,
};

// Cada vista anota acá lo que hay que dibujar cuando llegan los datos. Se dibujan en el orden en que
// app.js importa las vistas.
const renders = [];
export const alCambiarDatos = (render) => renders.push(render);

// El error que da Supabase cuando una tabla todavía no existe (falta correr su .sql).
export const faltaTabla = (err) => err && (err.code === "42P01" || err.code === "PGRST205" || /does not exist|schema cache/i.test(err.message));

export async function loadAll() {
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
  // Si todavía no se corrió supabase/002-precios.sql, la pestaña Precios lo avisa en vez de mostrar un error.
  state.preciosOk = !faltaTabla(piErr) && !faltaTabla(qErr);
  if (piErr && !faltaTabla(piErr)) toast("Error cargando precios: " + piErr.message);
  if (qErr && !faltaTabla(qErr)) toast("Error cargando presupuestos: " + qErr.message);
  state.projects = projects || [];
  state.transactions = transactions || [];
  state.priceItems = priceItems || [];
  state.quotes = quotes || [];
  // Si todavía no se corrió supabase/003-presupuestos-pdf.sql, los presupuestos vienen sin la columna "doc".
  if (state.quotes.length) state.docOk = "doc" in state.quotes[0];
  renderAll();
}

function renderAll() {
  renders.forEach((render) => render());
}

export async function borrar(tabla, id, pregunta, ok) {
  if (!confirm(pregunta)) return;
  const { error } = await supabase.from(tabla).delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast(ok);
  loadAll();
}
