// C. Proyectos
import {
  test, expect, abrirPanel, esperarToast, fechaAR, filas, hoyAR, insertar, irA, leer, modal, qa, responderConfirm,
} from "../ayuda.js";

const campo = (page, nombre) => modal(page).locator(`[name="${nombre}"]`);
const guardar = (page) => modal(page).getByRole("button", { name: "Guardar" }).click();

test("PRO-01 · Crear", async ({ page }) => {
  await abrirPanel(page);
  await irA(page, "proyectos");
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Nuevo proyecto");
  await campo(page, "name").fill(qa("Proyecto nuevo"));
  await campo(page, "client_name").fill("Cliente de prueba");
  await campo(page, "status").selectOption("activo");
  await campo(page, "start_date").fill("2026-09-01");
  await campo(page, "description").fill("Descripción de prueba");
  await guardar(page);
  await esperarToast(page, "Proyecto creado.");
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(() => filas(page, "tabla-proyectos")).toEqual([
    ["QA · Proyecto nuevo", "Cliente de prueba", "activo", fechaAR("2026-09-01"), "Editar Borrar"],
  ]);
  await irA(page, "resumen");
  await expect.poll(() => filas(page, "tabla-proyectos-activos")).toEqual([["QA · Proyecto nuevo", "Cliente de prueba"]]);
});

test("PRO-02 · Nombre obligatorio", async ({ page }) => {
  await abrirPanel(page);
  await irA(page, "proyectos");
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  await guardar(page);
  expect(await campo(page, "name").evaluate((el) => el.validity.valueMissing)).toBe(true);
  await expect(modal(page)).toBeVisible();
  expect(await leer("projects")).toHaveLength(0);
});

test("PRO-03 · Editar", async ({ page }) => {
  await insertar("projects", { name: "Para editar", client_name: "Cliente", status: "activo", start_date: "2026-08-15", description: "Algo" });
  await abrirPanel(page);
  await expect(page.locator("#kpi-activos")).toHaveText("1");
  await irA(page, "proyectos");
  await page.locator("#tabla-proyectos").getByRole("button", { name: "Editar" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Editar proyecto");
  await expect(campo(page, "name")).toHaveValue("QA · Para editar");
  await expect(campo(page, "client_name")).toHaveValue("Cliente");
  await expect(campo(page, "status")).toHaveValue("activo");
  await expect(campo(page, "start_date")).toHaveValue("2026-08-15");
  await expect(campo(page, "description")).toHaveValue("Algo");
  await campo(page, "status").selectOption("pausado");
  await guardar(page);
  await esperarToast(page, "Proyecto actualizado.");
  await expect(page.locator("#tabla-proyectos .badge")).toHaveText("pausado");
  await expect(page.locator("#kpi-activos")).toHaveText("0");
  await expect.poll(() => filas(page, "tabla-proyectos-activos")).toEqual([]);
});

test("PRO-04 · Filtro por estado", async ({ page }) => {
  await insertar("projects", [{ name: "Uno activo", status: "activo" }, { name: "Uno pausado", status: "pausado" }]);
  await abrirPanel(page);
  await irA(page, "proyectos");
  await page.locator("#filtro-estado-proyecto").selectOption("pausado");
  await expect.poll(async () => (await filas(page, "tabla-proyectos")).map((f) => f[0])).toEqual(["QA · Uno pausado"]);

  await page.locator("#filtro-estado-proyecto").selectOption("finalizado");
  await expect.poll(() => filas(page, "tabla-proyectos")).toEqual([]);
  await expect(page.locator("#empty-proyectos")).toBeVisible();
  await expect(page.locator("#empty-proyectos")).toHaveText("Todavía no cargaste ningún proyecto.");
});

test("PRO-05 · Borrar", async ({ page }) => {
  const p = await insertar("projects", { name: "Para borrar", status: "activo" });
  await insertar("transactions", { type: "ingreso", amount: 1000, date: hoyAR(), description: "Del proyecto", project_id: p.id });
  await abrirPanel(page);
  await irA(page, "proyectos");
  const pregunta = responderConfirm(page, true);
  await page.locator("#tabla-proyectos").getByRole("button", { name: "Borrar" }).click();
  expect(await pregunta).toBe("¿Borrar este proyecto? Los movimientos asociados quedan sin proyecto.");
  await esperarToast(page, "Proyecto borrado.");
  await expect.poll(() => filas(page, "tabla-proyectos")).toEqual([]);
  await irA(page, "movimientos");
  await expect.poll(async () => (await filas(page, "tabla-movimientos"))[0][3]).toBe("—");
  expect((await leer("transactions"))[0].project_id).toBeNull();
});

test("PRO-06 · Arrepentirse de borrar", async ({ page }) => {
  await insertar("projects", { name: "No se borra", status: "activo" });
  await abrirPanel(page);
  await irA(page, "proyectos");
  const pregunta = responderConfirm(page, false);
  await page.locator("#tabla-proyectos").getByRole("button", { name: "Borrar" }).click();
  await pregunta;
  await expect.poll(() => filas(page, "tabla-proyectos")).toHaveLength(1);
  expect(await leer("projects")).toHaveLength(1);
});

// E-02: los nombres se escriben en el HTML sin escapar; la comilla corta el valor del campo.
test('E-02 · Un nombre con comillas se corta al editar (así anda hoy)', async ({ page }) => {
  await insertar("projects", { name: 'Monitor 24"', status: "activo" });
  await abrirPanel(page);
  await irA(page, "proyectos");
  await expect.poll(async () => (await filas(page, "tabla-proyectos"))[0][0]).toBe('QA · Monitor 24"');
  await page.locator("#tabla-proyectos").getByRole("button", { name: "Editar" }).click();
  await expect(campo(page, "name")).toHaveValue("QA · Monitor 24");
});

// E-01: el formulario manda la fecha vacía como "" y la base no la acepta como fecha.
test("PRO-07 · Crear sin fecha de inicio (así anda hoy, ver E-01)", async ({ page }) => {
  await abrirPanel(page);
  await irA(page, "proyectos");
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  await campo(page, "name").fill(qa("Sin fecha"));
  await guardar(page);
  await esperarToast(page, 'Error: invalid input syntax for type date: ""');
  await expect(modal(page)).toBeVisible();
  expect(await leer("projects")).toHaveLength(0);
});
