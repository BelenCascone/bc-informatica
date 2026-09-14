// D. Movimientos
import {
  test, expect, abrirPanel, esperarToast, fechaAR, filas, hoyAR, insertar, irA, leer, modal, pesos, qa, responderConfirm,
} from "../ayuda.js";

const campo = (page, nombre) => modal(page).locator(`[name="${nombre}"]`);
const guardar = (page) => modal(page).getByRole("button", { name: "Guardar" }).click();
const color = (loc) => loc.evaluate((el) => getComputedStyle(el).color);

async function nuevoMovimiento(page) {
  await irA(page, "movimientos");
  await page.getByRole("button", { name: "+ Nuevo movimiento" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Nuevo movimiento");
}

test("MOV-01 · Crear ingreso", async ({ page }) => {
  await abrirPanel(page);
  await nuevoMovimiento(page);
  await expect(campo(page, "date")).toHaveValue(hoyAR());
  await campo(page, "type").selectOption("ingreso");
  await campo(page, "amount").fill("50000");
  await campo(page, "description").fill(qa("Ingreso nuevo"));
  await guardar(page);
  await esperarToast(page, "Movimiento creado.");
  await expect.poll(() => filas(page, "tabla-movimientos")).toEqual([
    [fechaAR(hoyAR()), "ingreso", "—", "—", "QA · Ingreso nuevo", pesos(50000), "Editar Borrar"],
  ]);
  expect(await color(page.locator("#tabla-movimientos .badge"))).toBe("rgb(198, 255, 0)");
});

test.describe("de noche", () => {
  // 23:30 en Argentina: en UTC ya es mañana.
  test("MOV-02 · Fecha de hoy de noche", async ({ page }) => {
    const hoy = hoyAR();
    await page.clock.setFixedTime(new Date(`${hoy}T23:30:00-03:00`));
    await abrirPanel(page);
    await nuevoMovimiento(page);
    await expect(campo(page, "date")).toHaveValue(hoy);
  });
});

test("MOV-03 · Egreso con proyecto y categoría", async ({ page }) => {
  await insertar("projects", { name: "Proyecto X", status: "activo" });
  await abrirPanel(page);
  await nuevoMovimiento(page);
  await campo(page, "type").selectOption("egreso");
  await campo(page, "amount").fill("12000");
  await campo(page, "category").selectOption("service");
  await campo(page, "project_id").selectOption({ label: "QA · Proyecto X" });
  await campo(page, "description").fill(qa("Egreso con proyecto"));
  await guardar(page);
  await esperarToast(page, "Movimiento creado.");
  await expect.poll(() => filas(page, "tabla-movimientos")).toEqual([
    [fechaAR(hoyAR()), "egreso", "service", "QA · Proyecto X", "QA · Egreso con proyecto", pesos(12000), "Editar Borrar"],
  ]);
  expect(await color(page.locator("#tabla-movimientos .badge"))).toBe("rgb(255, 107, 94)");
});

test("MOV-04 · Monto obligatorio y positivo", async ({ page }) => {
  await abrirPanel(page);
  await nuevoMovimiento(page);
  await campo(page, "description").fill(qa("Sin monto"));
  await guardar(page);
  expect(await campo(page, "amount").evaluate((el) => el.validity.valueMissing)).toBe(true);
  await expect(modal(page)).toBeVisible();

  await campo(page, "amount").fill("0");
  await guardar(page);
  expect(await campo(page, "amount").evaluate((el) => el.validity.rangeUnderflow)).toBe(true);
  await expect(modal(page)).toBeVisible();
  expect(await leer("transactions")).toHaveLength(0);
});

test("MOV-05 · Editar", async ({ page }) => {
  await insertar("transactions", { type: "ingreso", amount: 100000, date: hoyAR(), description: "Para editar" });
  await abrirPanel(page);
  await expect(page.locator("#kpi-ingresos")).toHaveText(pesos(100000));
  await irA(page, "movimientos");
  await page.locator("#tabla-movimientos").getByRole("button", { name: "Editar" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Editar movimiento");
  await expect(campo(page, "amount")).toHaveValue("100000");
  await campo(page, "amount").fill("80000");
  await guardar(page);
  await esperarToast(page, "Movimiento actualizado.");
  await expect.poll(async () => (await filas(page, "tabla-movimientos"))[0][5]).toBe(pesos(80000));
  await irA(page, "resumen");
  await expect(page.locator("#kpi-ingresos")).toHaveText(pesos(80000));
  await expect(page.locator("#kpi-balance")).toHaveText(pesos(80000));
});

test("MOV-06 · Borrar", async ({ page }) => {
  await insertar("transactions", { type: "egreso", amount: 5000, date: hoyAR(), description: "Para borrar" });
  await abrirPanel(page);
  await irA(page, "movimientos");
  const pregunta = responderConfirm(page, true);
  await page.locator("#tabla-movimientos").getByRole("button", { name: "Borrar" }).click();
  expect(await pregunta).toBe("¿Borrar este movimiento?");
  await esperarToast(page, "Movimiento borrado.");
  await expect.poll(() => filas(page, "tabla-movimientos")).toEqual([]);
  expect(await leer("transactions")).toHaveLength(0);
});

test("MOV-07 · Filtros combinados", async ({ page }) => {
  const [a, b] = await insertar("projects", [{ name: "Proyecto A", status: "activo" }, { name: "Proyecto B", status: "activo" }]);
  await insertar("transactions", [
    { type: "egreso", amount: 1000, date: hoyAR(), description: "Egreso de A", project_id: a.id },
    { type: "ingreso", amount: 2000, date: hoyAR(), description: "Ingreso de A", project_id: a.id },
    { type: "egreso", amount: 3000, date: hoyAR(), description: "Egreso de B", project_id: b.id },
    { type: "egreso", amount: 4000, date: hoyAR(), description: "Egreso sin proyecto" },
  ]);
  await abrirPanel(page);
  await irA(page, "movimientos");
  await page.locator("#filtro-tipo-mov").selectOption("egreso");
  await page.locator("#filtro-proyecto-mov").selectOption({ label: "QA · Proyecto A" });
  await expect.poll(async () => (await filas(page, "tabla-movimientos")).map((f) => f[4])).toEqual(["QA · Egreso de A"]);
});

test("MOV-08 · El filtro se mantiene", async ({ page }) => {
  const a = await insertar("projects", { name: "Proyecto A", status: "activo" });
  await abrirPanel(page);
  await irA(page, "movimientos");
  await page.locator("#filtro-proyecto-mov").selectOption(a.id);
  await page.getByRole("button", { name: "+ Nuevo movimiento" }).click();
  await campo(page, "amount").fill("1500");
  await campo(page, "project_id").selectOption(a.id);
  await campo(page, "description").fill(qa("Con filtro"));
  await guardar(page);
  await esperarToast(page, "Movimiento creado.");
  await expect(page.locator("#filtro-proyecto-mov")).toHaveValue(a.id);
  await expect.poll(async () => (await filas(page, "tabla-movimientos")).map((f) => f[4])).toEqual(["QA · Con filtro"]);
});
