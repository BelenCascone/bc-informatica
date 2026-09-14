// G. Excel de respaldo
import ExcelJS from "exceljs";
import { test, expect, abrirPanel, esperarToast, hoyAR, insertar, mesAtras } from "../ayuda.js";

async function descargar(page) {
  const boton = page.getByRole("button", { name: "Descargar Excel" });
  const descarga = page.waitForEvent("download");
  await boton.click();
  return { boton, descarga };
}

test("XLS-01 · Descargar", async ({ page }) => {
  await abrirPanel(page);
  const { boton, descarga } = await descargar(page);
  await expect(page.locator("[data-excel]")).toHaveText("Armando el Excel…");
  await expect(page.locator("[data-excel]")).toBeDisabled();
  expect((await descarga).suggestedFilename()).toBe(`BC-Informatica-seguimiento-${hoyAR()}.xlsx`);
  await esperarToast(page, "Excel descargado.");
  await expect(boton).toBeEnabled();
  await expect(boton).toHaveText("Descargar Excel");
});

test("XLS-02 · Hojas y datos", async ({ page }) => {
  const p = await insertar("projects", { name: "Proyecto Excel", status: "activo", start_date: mesAtras(2, 5) });
  await insertar("transactions", [
    { type: "egreso", amount: 30000, date: mesAtras(2, 10), description: "Egreso viejo", project_id: p.id },
    { type: "ingreso", amount: 100000, date: hoyAR(), description: "Ingreso nuevo", project_id: p.id },
  ]);
  await insertar("quotes", { title: "Presupuesto Excel", category: "service", date: hoyAR(), status: "aceptado", list_price: 50000, final_price: 50000, hours_real: 2 });
  await insertar("price_items", { category: "service", name: "Precio Excel", price: 20000, unit: "trabajo", updated_on: hoyAR() });
  await abrirPanel(page);
  const balance = await page.locator("#kpi-balance").textContent();

  const { descarga } = await descargar(page);
  const ruta = test.info().outputPath("respaldo.xlsx");
  await (await descarga).saveAs(ruta);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);

  expect(wb.worksheets.map((ws) => ws.name)).toEqual(["Resumen mensual", "Movimientos", "Proyectos", "Presupuestos", "Precios"]);
  for (const ws of wb.worksheets) {
    expect(ws.getRow(1).getCell(1).fill.fgColor.argb, `cabecera de ${ws.name}`).toBe("FFC6FF00");
  }

  // Fechas sin correrse un día: se guardan en UTC.
  const iso = (v) => v.toISOString().slice(0, 10);
  const movs = wb.getWorksheet("Movimientos");
  expect([iso(movs.getCell("A2").value), movs.getCell("B2").value, movs.getCell("D2").value, movs.getCell("F2").value])
    .toEqual([mesAtras(2, 10), "egreso", "QA · Proyecto Excel", 30000]);
  expect([iso(movs.getCell("A3").value), movs.getCell("B3").value, movs.getCell("F3").value]).toEqual([hoyAR(), "ingreso", 100000]);
  expect(iso(wb.getWorksheet("Proyectos").getCell("D2").value)).toBe(mesAtras(2, 5));

  // Resumen mensual con fórmulas; el resultado guardado coincide con el panel.
  const resumen = wb.getWorksheet("Resumen mensual");
  const filas = resumen.getRows(2, resumen.rowCount - 1);
  // En una celda con fórmula, ExcelJS devuelve { formula, result } y deja result vacío cuando es 0.
  const resultado = (c) => (c.value && typeof c.value === "object" && "formula" in c.value ? c.value.result ?? 0 : c.value);
  expect(filas).toHaveLength(3);
  expect(resumen.getCell("B2").value.formula).toMatch(/^SUMIFS\(Movimientos!/);
  expect(filas.reduce((s, f) => s + resultado(f.getCell(2)), 0)).toBe(100000);
  expect(filas.reduce((s, f) => s + resultado(f.getCell(3)), 0)).toBe(30000);
  const acumulado = resultado(filas.at(-1).getCell(5));
  expect(acumulado).toBe(70000);
  expect(balance.replace(/\s/g, " ")).toBe("$ 70.000");

  const proyectos = wb.getWorksheet("Proyectos");
  expect([resultado(proyectos.getCell("G2")), resultado(proyectos.getCell("H2")), resultado(proyectos.getCell("I2"))]).toEqual([100000, 30000, 70000]);
  expect(proyectos.getCell("G2").value.formula).toMatch(/^SUMIFS\(Movimientos!/);

  const presupuestos = wb.getWorksheet("Presupuestos");
  expect(resultado(presupuestos.getCell("K2"))).toBe(25000);
  expect(wb.getWorksheet("Precios").getCell("A2").value).toBe("QA · Precio Excel");
});
