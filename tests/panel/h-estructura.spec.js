// H. Propios del sprint 01: que partir app.js no rompa nada.
import { readFileSync } from "node:fs";
import { test, expect, PANEL, abrirPanel, hoyAR, insertar, irA, juntarErrores, modal, qa, esperarToast } from "../ayuda.js";

const enBuild = Boolean(process.env.PANEL_BUILD);

async function cargarDeTodo() {
  const p = await insertar("projects", { name: "Proyecto", status: "activo" });
  await insertar("transactions", { type: "ingreso", amount: 1000, date: hoyAR(), description: "Movimiento", project_id: p.id });
  await insertar("price_items", { category: "service", name: "Precio", price: 20000, unit: "trabajo", updated_on: hoyAR() });
  await insertar("quotes", { title: "Presupuesto", category: "service", date: hoyAR(), status: "borrador", final_price: 1000 });
}

async function abrirYCerrar(page, boton, cerrar = "Cancelar") {
  await boton.click();
  await expect(modal(page)).toBeVisible();
  await modal(page).getByRole("button", { name: cerrar, exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
}

test("EST-01 · Consola limpia", async ({ page }) => {
  const errores = juntarErrores(page);
  await cargarDeTodo();
  await abrirPanel(page);
  await abrirYCerrar(page, page.locator("#pin-toggle-btn"), "Ahora no");

  await irA(page, "proyectos");
  await abrirYCerrar(page, page.getByRole("button", { name: "+ Nuevo proyecto" }));
  await abrirYCerrar(page, page.locator("#tabla-proyectos").getByRole("button", { name: "Editar" }));

  await irA(page, "movimientos");
  await abrirYCerrar(page, page.getByRole("button", { name: "+ Nuevo movimiento" }));
  await abrirYCerrar(page, page.locator("#tabla-movimientos").getByRole("button", { name: "Editar" }));

  await irA(page, "precios");
  await abrirYCerrar(page, page.getByRole("button", { name: "+ Nuevo presupuesto" }));
  await abrirYCerrar(page, page.locator("#tabla-presupuestos").getByRole("button", { name: "Ver / editar" }));
  await abrirYCerrar(page, page.getByRole("button", { name: "+ Nuevo precio" }));
  await abrirYCerrar(page, page.locator("#tabla-precios").getByRole("button", { name: "Editar" }));

  await irA(page, "resumen");
  expect(errores).toEqual([]);
});

test("EST-02 · Todos los archivos cargan", async ({ page, baseURL }) => {
  const respuestas = [];
  page.on("response", (r) => r.url().startsWith(baseURL) && respuestas.push({ url: new URL(r.url()).pathname, status: r.status(), tipo: r.request().resourceType() }));
  await abrirPanel(page);
  expect(respuestas.filter((r) => r.status >= 400)).toEqual([]);
  const scripts = respuestas.filter((r) => r.tipo === "script").map((r) => r.url);
  expect(scripts).toContain("/panel/app.js");
  expect(scripts).toContain("/panel/config.js");
  expect(scripts.filter((u) => !u.startsWith("/panel/"))).toEqual([]);
  // Entre archivos del panel, todo import va con ruta absoluta.
  for (const u of scripts) {
    for (const desde of imports(u)) {
      if (!desde.startsWith("https://")) expect(desde, `import en ${u}`).toMatch(/^\/panel\//);
    }
  }
});

// Pendiente conocido: supabase-js se cargaba como "@2". Toda librería de jsDelivr va con versión exacta.
test("EST-02 · Librerías con versión exacta", async ({ page, baseURL }) => {
  const scripts = [];
  page.on("response", (r) => r.url().startsWith(baseURL) && r.request().resourceType() === "script" && scripts.push(new URL(r.url()).pathname));
  await abrirPanel(page);
  const codigo = ["/panel/index.html", ...scripts].map((u) => readFileSync(new URL(`../../public${u}`, import.meta.url), "utf8")).join("\n");
  const libs = [...codigo.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^/@"']+)@([^/"']+)/g)].map(([, lib, v]) => `${lib}@${v}`);
  expect(libs.length).toBeGreaterThanOrEqual(3);
  expect(libs.filter((l) => !/@\d+\.\d+\.\d+$/.test(l))).toEqual([]);
});

const imports = (u) => {
  const codigo = readFileSync(new URL(`../../public${u}`, import.meta.url), "utf8");
  return [...codigo.matchAll(/^\s*(?:import|export)\b[^"'\n]*\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm)].map((m) => m[1] || m[2]);
};

// En local, "/panel" (sin barra) muestra la landing: lo resuelve una regla de vercel.json que sólo corre
// en Vercel. Acá se prueba "/panel/" en el build y que la regla siga en su lugar; "/panel" se mira en EST-05.
test("EST-03 · /panel con y sin barra", async ({ page }) => {
  const reglas = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")).rewrites;
  const i = reglas.findIndex((r) => r.source === "/panel" && r.destination === "/panel/index.html");
  expect(i, "regla /panel → /panel/index.html en vercel.json").toBeGreaterThanOrEqual(0);
  expect(i, "la regla de /panel va antes de la que manda todo a la landing").toBeLessThan(reglas.findIndex((r) => r.source === "/(.*)"));

  test.skip(!enBuild, "con vite dev, /panel/ muestra la landing: se prueba en el build (npm run test:build)");
  await abrirPanel(page, { ruta: "/panel/" });
  await expect(page).toHaveTitle("Panel // BC Informática");
});

test("EST-06 · La landing no cambió", async ({ page }) => {
  const errores = juntarErrores(page);
  await page.goto("/");
  await expect(page.locator("#v-inicio")).toHaveClass(/is-active/);
  for (const ruta of ["servicios", "proyectos", "precios", "sobre-mi", "contacto", "inicio"]) {
    await page.locator(`#tabs a[href="#/${ruta}"]`).click();
    await expect(page.locator(`#v-${ruta}`)).toHaveClass(/is-active/);
    await expect(page.locator("section.view.is-active")).toHaveCount(1);
    await expect(page.locator("#crumb")).toContainText(`~/bc-informatica/${ruta}.`);
  }
  expect(errores).toEqual([]);
});

test.describe("en el celular", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("EST-07 · En el celular", async ({ page }) => {
    await abrirPanel(page);
    const tabs = page.locator("nav.tabs");
    await expect(tabs).toHaveCSS("overflow-x", "auto");
    for (const vista of ["proyectos", "movimientos", "precios", "resumen"]) await irA(page, vista);

    await irA(page, "precios");
    await page.getByRole("button", { name: "+ Nuevo presupuesto" }).click();
    await modal(page).locator('[name="title"]').fill(qa("Desde el celular"));
    await modal(page).getByRole("button", { name: "+ Renglón en blanco" }).click();
    await modal(page).locator('#presu-items [data-k="concepto"]').fill("Trabajo");
    await modal(page).locator('#presu-items [data-k="precio"]').fill("10000");
    await modal(page).getByRole("button", { name: "Guardar", exact: true }).click();
    await esperarToast(page, "Presupuesto guardado.");
    await expect(page.locator("#tabla-presupuestos tr")).toHaveCount(1);
  });
});
