// B. Pestañas y Resumen (y el respaldo en JSON del sprint 02, que está en Resumen)
import { readFileSync } from "node:fs";
import {
  test, expect, abrirPanel, esperarToast, filas, fechaAR, hoyAR, insertar, irA, mesAtras, pesos, sumarDias,
} from "../ayuda.js";

const LIMA = "rgb(198, 255, 0)";
const ROJO = "rgb(255, 107, 94)";
const color = (loc) => loc.evaluate((el) => getComputedStyle(el).color);

// Un precio con el último ajuste hace 4 meses siempre da aviso "Ajustar".
const precioViejo = (n) => ({ category: "service", name: `Precio viejo ${n}`, price: 20000, unit: "trabajo", updated_on: mesAtras(4) });

test("NAV-01 · Cambiar de pestaña", async ({ page }) => {
  await abrirPanel(page);
  for (const vista of ["proyectos", "movimientos", "precios", "resumen"]) {
    await irA(page, vista);
    await expect(page.locator(".view.active")).toHaveCount(1);
    await expect(page.locator(".view.active")).toHaveId(`view-${vista}`);
    const tab = page.locator(`.tab-btn[data-view="${vista}"]`);
    await expect(page.locator(".tab-btn.active")).toHaveCount(1);
    await expect(tab).toHaveClass(/active/);
    expect(await color(tab)).toBe(LIMA);
  }
});

test("NAV-02 · Ir a Precios desde un aviso", async ({ page }) => {
  await insertar("price_items", precioViejo(1));
  await abrirPanel(page);
  await expect(page.locator("#resumen-avisos")).toBeVisible();
  await page.getByRole("button", { name: "Ver todos →" }).click();
  await expect(page.locator("#view-precios")).toHaveClass(/active/);
  await expect(page.locator('.tab-btn[data-view="precios"]')).toHaveClass(/active/);
});

test("RES-01 · Números de arriba", async ({ page }) => {
  await insertar("transactions", [
    { type: "ingreso", amount: 100000, date: hoyAR(), description: "Ingreso" },
    { type: "egreso", amount: 30000, date: hoyAR(), description: "Egreso" },
  ]);
  await abrirPanel(page);
  const balance = page.locator("#kpi-balance");
  await expect(balance).toHaveText(pesos(70000));
  expect(await color(balance)).toBe(LIMA);
  await expect(page.locator("#kpi-ingresos")).toHaveText(pesos(100000));
  await expect(page.locator("#kpi-egresos")).toHaveText(pesos(30000));

  await test.step("con balance negativo, en rojo", async () => {
    await insertar("transactions", { type: "egreso", amount: 100000, date: hoyAR(), description: "Egreso grande" });
    await page.reload();
    await expect(balance).toHaveText(pesos(-30000));
    expect(await color(balance)).toBe(ROJO);
  });
});

test("RES-02 · Proyectos activos", async ({ page }) => {
  await insertar("projects", [
    { name: "Activo", status: "activo", client_name: "Cliente A" },
    { name: "Pausado", status: "pausado" },
    { name: "Finalizado", status: "finalizado" },
  ]);
  await abrirPanel(page);
  await expect(page.locator("#kpi-activos")).toHaveText("1");
  await expect.poll(() => filas(page, "tabla-proyectos-activos")).toEqual([["QA · Activo", "Cliente A"]]);
});

test("RES-03 · Gráfico de 6 meses", async ({ page }) => {
  await insertar("transactions", [
    { type: "ingreso", amount: 50000, date: hoyAR(), description: "Ingreso de este mes" },
    { type: "egreso", amount: 20000, date: mesAtras(2, 10), description: "Egreso de hace 2 meses" },
  ]);
  await abrirPanel(page);
  const datos = await page.evaluate(() => {
    const c = window.Chart.getChart(document.getElementById("chart-mensual"));
    return { labels: c.data.labels, sets: c.data.datasets.map((d) => ({ label: d.label, data: d.data, color: d.backgroundColor })) };
  });
  expect(datos.labels).toHaveLength(6);
  const [ingresos, egresos] = datos.sets;
  expect(ingresos).toEqual({ label: "Ingresos", data: [0, 0, 0, 0, 0, 50000], color: "#C6FF00" });
  expect(egresos).toEqual({ label: "Egresos", data: [0, 0, 0, 20000, 0, 0], color: "#ff6b5e" });
  // Las etiquetas son este mes y los 5 anteriores (con el formato de fecha del navegador).
  const esperadas = await page.evaluate((isos) =>
    isos.map((iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { month: "short", year: "2-digit" })),
  [5, 4, 3, 2, 1, 0].map((n) => mesAtras(n)));
  expect(datos.labels).toEqual(esperadas);
});

test("RES-04 · Últimos movimientos", async ({ page }) => {
  const hoy = hoyAR();
  await insertar("transactions", Array.from({ length: 10 }, (_, i) => ({
    type: "ingreso", amount: 1000 * (i + 1), date: sumarDias(hoy, -i), description: `Movimiento ${i + 1}`,
  })));
  await abrirPanel(page);
  const lista = await filas(page, "tabla-ultimos-mov");
  expect(lista).toHaveLength(8);
  expect(lista.map((f) => f[2])).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `QA · Movimiento ${n}`));
  expect(lista[0]).toEqual([fechaAR(hoy), "ingreso", "QA · Movimiento 1", pesos(1000)]);
});

test("RES-05 · Vacío", async ({ page }) => {
  await abrirPanel(page);
  await expect(page.locator("#empty-ultimos-mov")).toBeVisible();
  await expect(page.locator("#empty-ultimos-mov")).toHaveText("Todavía no cargaste movimientos.");
  await expect(page.locator("#empty-proyectos-activos")).toBeVisible();
  await expect(page.locator("#empty-proyectos-activos")).toHaveText("No hay proyectos activos.");
});

test("RES-06 · Avisos en Resumen", async ({ page }) => {
  await abrirPanel(page);
  await expect(page.locator("#resumen-avisos")).toBeHidden();

  await insertar("price_items", [1, 2, 3, 4].map(precioViejo));
  await page.reload();
  await expect(page.locator("#resumen-avisos")).toBeVisible();
  await expect(page.locator("#resumen-avisos h2")).toHaveText("// Avisos de precios");
  await expect(page.locator("#lista-avisos-resumen li")).toHaveCount(3);
  await expect(page.locator("#lista-avisos li")).toHaveCount(4);
});

// ---------- F. Respaldo en JSON (sprint 02) ----------
const TABLAS_RESPALDO = [
  "projects", "transactions", "price_items", "quotes",
  "sprints", "tasks", "task_events", "qa_cases", "qa_runs", "bugs", "journal",
];
const DEL_BOARD = TABLAS_RESPALDO.slice(4);

async function bajarRespaldo(page) {
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar respaldo (JSON)" }).click();
  return descarga;
}
const leerRespaldo = async (descarga) => JSON.parse(readFileSync(await descarga.path(), "utf8"));

test("JSN-01 · Descargar el respaldo", async ({ page }) => {
  await abrirPanel(page);
  const boton = page.locator("[data-respaldo]");
  const descarga = bajarRespaldo(page);
  await expect(boton).toHaveText("Armando el respaldo…");
  await expect(boton).toBeDisabled();
  expect((await descarga).suggestedFilename()).toBe(`BC-Informatica-respaldo-${hoyAR()}.json`);
  await esperarToast(page, "Respaldo descargado.");
  await expect(boton).toBeEnabled();
  await expect(boton).toHaveText("Descargar respaldo (JSON)");
});

test("JSN-02 · Qué trae el respaldo", async ({ page }) => {
  const p = await insertar("projects", { name: "Proyecto respaldo", status: "activo", start_date: hoyAR() });
  const cargadas = {
    projects: p,
    transactions: await insertar("transactions", { type: "ingreso", amount: 1000, date: hoyAR(), project_id: p.id, description: "Cobro" }),
    price_items: await insertar("price_items", { category: "service", name: "Precio", price: 1000, unit: "trabajo", updated_on: hoyAR() }),
    quotes: await insertar("quotes", { title: "Presupuesto", category: "service", date: hoyAR(), status: "borrador", final_price: 1000 }),
    sprints: await insertar("sprints", { project_id: p.id, numero: 1, nombre: "Sprint" }),
  };
  cargadas.tasks = await insertar("tasks", { project_id: p.id, sprint_id: cargadas.sprints.id, titulo: "Tarea" });
  cargadas.qa_cases = await insertar("qa_cases", { project_id: p.id, titulo: "Caso" });
  cargadas.qa_runs = await insertar("qa_runs", { qa_case_id: cargadas.qa_cases.id, task_id: cargadas.tasks.id, resultado: "pasa" });
  cargadas.bugs = await insertar("bugs", { project_id: p.id, titulo: "Bug" });
  cargadas.journal = await insertar("journal", { project_id: p.id, texto: "Entrada" });

  await abrirPanel(page);
  const respaldo = await leerRespaldo(await bajarRespaldo(page));
  expect(Math.abs(new Date(respaldo.armado) - Date.now())).toBeLessThan(60_000);
  expect(Object.keys(respaldo.tablas)).toEqual(TABLAS_RESPALDO);
  expect(respaldo.faltan).toBeUndefined();
  for (const [tabla, fila] of Object.entries(cargadas)) {
    // La fila completa, con todas sus columnas. El último movimiento del proyecto se corrió con lo que
    // se cargó después, así que ese no se compara.
    const enRespaldo = respaldo.tablas[tabla].find((f) => f.id === fila.id);
    const { ultimo_movimiento, ...resto } = fila;
    expect(enRespaldo, tabla).toMatchObject(resto);
    expect(Object.keys(enRespaldo).sort(), tabla).toEqual(Object.keys(fila).sort());
  }
  expect(respaldo.tablas.projects[0]).toHaveProperty("pulso", "andando");
  expect(respaldo.tablas.task_events.map((e) => [e.task_id, e.estado_nuevo])).toEqual([[cargadas.tasks.id, "backlog"]]);
});

test("JSN-03 · Respaldo si falta correr un .sql", async ({ page }) => {
  await insertar("projects", { name: "Proyecto sin board", status: "activo", start_date: hoyAR() });
  await page.route((url) => DEL_BOARD.some((tabla) => url.pathname === `/rest/v1/${tabla}`), (route) =>
    route.fulfill({
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
      json: { code: "PGRST205", message: "Could not find the table in the schema cache" },
    })
  );
  await abrirPanel(page);
  const respaldo = await leerRespaldo(await bajarRespaldo(page));
  await esperarToast(page, `Respaldo descargado sin ${DEL_BOARD.join(", ")}: falta correr supabase/004-board.sql.`);
  expect(Object.keys(respaldo.tablas)).toEqual(TABLAS_RESPALDO.slice(0, 4));
  expect(respaldo.faltan).toEqual(DEL_BOARD);
  expect(respaldo.tablas.projects).toHaveLength(1);
});
