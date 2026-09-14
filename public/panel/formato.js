// Formatos de plata, fechas y texto que usan todas las vistas.

export const money = (n) =>
  Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const dateFmt = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

// Fecha local: toISOString() da la de UTC, que después de las 21 en Argentina ya es mañana.
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const sumarDias = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmtPct = (n) => `${(n * 100).toFixed(1).replace(".", ",")}%`;
export const redondear = (n) => Math.round(n / 500) * 500;
export const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

export const opciones = (valores, actual, etiqueta = (v) => v) =>
  valores.map((v) => `<option value="${v}" ${actual === v ? "selected" : ""}>${etiqueta(v)}</option>`).join("");
