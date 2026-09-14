// Cuentas de precios que usan Precios, Presupuestos y el Excel: inflación, mercado, tarifa por hora.
import { state } from "/panel/estado.js";
import { money } from "/panel/formato.js";

export const CATEGORIAS_PRECIO = {
  service: "Service", sistemas: "Sistemas", clases: "Clases", asesoria: "Asesoría", abonos: "Abonos", otros: "Otros",
};
export const REFS = window.REFERENCIAS_MERCADO || { revisado: null, items: [] };

// Inflación publicada en los meses posteriores al mes de la fecha dada.
// El mes en curso no cuenta: el INDEC lo publica a mitad del mes siguiente.
export function inflacionDesde(fecha) {
  if (!state.ipc.length || !fecha) return null;
  const desde = fecha.slice(0, 7);
  const meses = state.ipc.filter((x) => x.fecha.slice(0, 7) > desde);
  return { acum: meses.reduce((f, x) => f * (1 + x.valor / 100), 1) - 1, meses: meses.length };
}

export function mesesDesde(fecha) {
  const d = new Date(fecha + "T00:00:00");
  const n = new Date();
  return Math.max(0, (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth()) - (n.getDate() < d.getDate() ? 1 : 0));
}

export function rangoEnPesos(ref) {
  if (ref.usdMin != null) {
    if (!state.dolarMep) return null;
    return { min: ref.usdMin * state.dolarMep, max: ref.usdMax * state.dolarMep };
  }
  return { min: ref.min, max: ref.max };
}

export function compararConMercado(precio, refKey) {
  const ref = REFS.items.find((r) => r.clave === refKey);
  if (!ref) return null;
  const rango = rangoEnPesos(ref);
  if (!rango) return { ref, rango: null, estado: null };
  if (precio < rango.min) return { ref, rango, estado: "bajo", dif: 1 - precio / rango.min };
  if (precio > rango.max) return { ref, rango, estado: "alto", dif: precio / rango.max - 1 };
  return { ref, rango, estado: "ok", dif: 0 };
}

export const fmtRango = (r) => (Math.round(r.min) === Math.round(r.max) ? money(r.min) : `${money(r.min)} – ${money(r.max)}`);

// La tarifa por hora sale de la lista de precios: el primer precio "por hora" de Sistemas.
export function tarifaHora() {
  const it = state.priceItems.find((p) => p.unit === "hora" && p.category === "sistemas");
  return it ? Number(it.price) : null;
}

export const porHora = (q) => (Number(q.hours_real) > 0 ? Number(q.final_price) / Number(q.hours_real) : null);
