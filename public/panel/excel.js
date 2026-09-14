// ---------- Excel de respaldo ----------
// Todo lo del panel en un .xlsx: sirve para abrirlo en Excel o subirlo a Google Drive y tener
// una copia por si algún día se pierde algo en Supabase. El resumen mensual y los totales por
// proyecto van con fórmulas, así que si sumás movimientos a mano en la planilla se recalculan solos.
import { state } from "/panel/estado.js";
import { hoyISO, num } from "/panel/formato.js";
import { CATEGORIAS_PRECIO, porHora } from "/panel/calculos.js";
import { toast } from "/panel/ui.js";

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
