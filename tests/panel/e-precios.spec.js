// E. Precios — lista, avisos y mercado
import {
  test, expect, abrirPanel, esperarToast, fechaAR, filas, hoyAR, inflacionFija, insertar, irA, juntarErrores, leer,
  mesAtras, modal, normal, pesos, qa, responderConfirm, toast,
} from "../ayuda.js";

const campo = (page, nombre) => modal(page).locator(`[name="${nombre}"]`);
const guardar = (page) => modal(page).getByRole("button", { name: "Guardar" }).click();
const color = (loc) => loc.evaluate((el) => getComputedStyle(el).color);
const LIMA = "rgb(198, 255, 0)";
const ROJO = "rgb(255, 107, 94)";

const precio = (datos) => ({ category: "service", unit: "trabajo", price: 20000, updated_on: hoyAR(), ...datos });
const avisos = (page) => page.locator("#lista-avisos li");
const textoAvisos = async (page) => (await page.locator("#lista-avisos li .txt").allTextContents()).map(normal);

async function abrirPrecios(page) {
  await abrirPanel(page);
  await irA(page, "precios");
}

test("PRE-01 · Tarifa por hora", async ({ page }) => {
  await abrirPrecios(page);
  await expect(page.locator("#kpi-tarifa")).toHaveText("—");
  await expect(page.locator("#kpi-tarifa-sub")).toHaveText("cargá un precio por hora en Sistemas");

  await insertar("price_items", precio({ category: "sistemas", unit: "hora", name: "Hora de desarrollo" }));
  await page.reload();
  await irA(page, "precios");
  await expect(page.locator("#kpi-tarifa")).toHaveText(pesos(20000));
  await expect(page.locator("#kpi-tarifa-sub")).toHaveText("de tu lista de precios");
});

test("PRE-02 · Crear precio", async ({ page }) => {
  await abrirPrecios(page);
  await page.getByRole("button", { name: "+ Nuevo precio" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Nuevo precio");
  await expect(campo(page, "updated_on")).toHaveValue(hoyAR());
  await campo(page, "name").fill(qa("Formateo"));
  await campo(page, "category").selectOption("service");
  await campo(page, "unit").selectOption("trabajo");
  await campo(page, "price").fill("30000");
  await guardar(page);
  await esperarToast(page, "Precio agregado.");
  await expect.poll(async () => (await filas(page, "tabla-precios")).map((f) => f.slice(0, 3))).toEqual([
    ["QA · Formateo | Service", `${pesos(30000)} | por trabajo`, `${fechaAR(hoyAR())} | este mes`],
  ]);
});

test("PRE-03 · Editar el monto sin tocar la fecha", async ({ page }) => {
  await insertar("price_items", precio({ name: "Precio viejo", updated_on: mesAtras(6, 10), adjust_every_months: 12 }));
  await abrirPrecios(page);
  await page.locator("#tabla-precios").getByRole("button", { name: "Editar" }).click();
  await expect(campo(page, "updated_on")).toHaveValue(mesAtras(6, 10));
  await campo(page, "price").fill("25000");
  await guardar(page);
  await esperarToast(page, "Precio actualizado.");
  await expect.poll(async () => (await filas(page, "tabla-precios"))[0].slice(1, 3)).toEqual([
    `${pesos(25000)} | por trabajo`, `${fechaAR(hoyAR())} | este mes`,
  ]);
  expect((await leer("price_items"))[0].updated_on).toBe(hoyAR());
});

test("PRE-04 · Editar la fecha a mano", async ({ page }) => {
  await insertar("price_items", precio({ name: "Precio viejo", updated_on: mesAtras(6, 10), adjust_every_months: 12 }));
  await abrirPrecios(page);
  await page.locator("#tabla-precios").getByRole("button", { name: "Editar" }).click();
  await campo(page, "price").fill("25000");
  await campo(page, "updated_on").fill(mesAtras(2));
  await guardar(page);
  await esperarToast(page, "Precio actualizado.");
  await expect.poll(async () => (await filas(page, "tabla-precios"))[0][2]).toBe(`${fechaAR(mesAtras(2))} | hace 2 meses`);
  expect((await leer("price_items"))[0].updated_on).toBe(mesAtras(2));
});

// Inflación fija del 2 % por mes. Ajuste hace 4 meses: se publicaron 3 meses desde entonces,
// 1,02³ − 1 = 6,1 %, y 20.000 × 1,0612 = 21.224 → redondeado a $ 500 = 21.000.
test("PRE-05 · Aviso de ajuste por tiempo", async ({ page }) => {
  await insertar("price_items", precio({ name: "Por tiempo", updated_on: mesAtras(4), adjust_every_months: 3 }));
  await abrirPrecios(page);
  await expect(avisos(page)).toHaveCount(1);
  await expect(page.locator("#lista-avisos li.subir .ico")).toHaveText("Ajustar");
  expect(await textoAvisos(page)).toEqual([
    normal(`QA · Por tiempo (${pesos(20000)}): el último ajuste fue hace 4 meses y la inflación publicada desde entonces suma 6,1%. Precio sugerido: ${pesos(21000)}.`),
  ]);
  await expect(page.locator("#avisos-count")).toBeVisible();
  await expect(page.locator("#avisos-count")).toHaveText("1");
  await expect(page.locator("#tabla-precios [data-ajustar-precio]")).toHaveText(`Aplicar ${pesos(21000)}`);
});

test.describe("con inflación del 3 %", () => {
  test.use({ mercado: { ipc: inflacionFija(3), mep: 1400 } });

  // Ajuste hace 3 meses, revisar cada 12: no toca por tiempo. Desde entonces se publicaron 2 meses:
  // 1,03² − 1 = 6,1 % ≥ 5 %. Sugerido: 20.000 × 1,0609 = 21.218 → 21.000.
  test("PRE-06 · Aviso de ajuste por inflación", async ({ page }) => {
    await insertar("price_items", precio({ name: "Por inflación", updated_on: mesAtras(3), adjust_every_months: 12 }));
    await abrirPrecios(page);
    expect(await textoAvisos(page)).toEqual([
      normal(`QA · Por inflación (${pesos(20000)}): el último ajuste fue hace 3 meses y la inflación publicada desde entonces suma 6,1%. Precio sugerido: ${pesos(21000)}.`),
    ]);
    await expect.poll(async () => (await filas(page, "tabla-precios"))[0][3]).toBe(`6,1% | sugerido ${pesos(21000)}`);
    await expect(page.locator("#tabla-precios .pill.subir")).toHaveText("6,1%");
  });
});

test("PRE-07 · Aplicar el sugerido", async ({ page }) => {
  await insertar("price_items", precio({ name: "Por tiempo", updated_on: mesAtras(4), adjust_every_months: 3 }));
  await abrirPrecios(page);
  const pregunta = responderConfirm(page, true);
  await page.locator("#tabla-precios [data-ajustar-precio]").click();
  expect(normal(await pregunta)).toBe(normal(`¿Pasar este precio a ${pesos(21000)} desde hoy?`));
  await esperarToast(page, "Precio actualizado.");
  await expect.poll(async () => (await filas(page, "tabla-precios"))[0].slice(1, 3)).toEqual([
    `${pesos(21000)} | por trabajo`, `${fechaAR(hoyAR())} | este mes`,
  ]);
  await expect(page.locator("#tabla-precios [data-ajustar-precio]")).toHaveCount(0);
  await expect(avisos(page)).toHaveCount(0);
  await expect(page.locator("#empty-avisos")).toBeVisible();
  await expect(page.locator("#avisos-count")).toBeHidden();
});

// "srv-formateo" en referencias.js: $ 44.524 – $ 64.931.
test("PRE-08 · Comparar con el mercado", async ({ page }) => {
  await insertar("price_items", [
    precio({ name: "Barato", price: 40000, ref_key: "srv-formateo" }),
    precio({ name: "Justo", price: 50000, ref_key: "srv-formateo" }),
    precio({ name: "Caro", price: 70000, ref_key: "srv-formateo" }),
  ]);
  await abrirPrecios(page);
  const rango = `${pesos(44524)} – ${pesos(64931)}`;
  await expect.poll(async () => Object.fromEntries((await filas(page, "tabla-precios")).map((f) => [f[0].split(" | ")[0], f[4]]))).toEqual({
    "QA · Barato": `10,2% abajo | ${rango}`,
    "QA · Justo": `en rango | ${rango}`,
    "QA · Caro": `7,8% arriba | ${rango}`,
  });
  await expect(page.locator("#lista-avisos li.bajo .ico")).toHaveText("Bajo");
  await expect(page.locator("#lista-avisos li.bajo")).toContainText("QA · Barato");
  await expect(page.locator("#lista-avisos li.alto .ico")).toHaveText("Alto");
  await expect(page.locator("#lista-avisos li.alto")).toContainText("QA · Caro");
  await expect(avisos(page)).toHaveCount(2);
});

test.describe("sin dólar", () => {
  test.use({ mercado: { ipc: inflacionFija(), mep: null } });

  test("PRE-09 · Referencia en dólares sin dólar", async ({ page }) => {
    const errores = juntarErrores(page);
    await insertar("price_items", precio({ category: "sistemas", unit: "hora", name: "Hora", ref_key: "sis-hora" }));
    await abrirPrecios(page);
    await expect.poll(async () => (await filas(page, "tabla-precios"))[0][4]).toBe("falta el dólar");
    expect(errores.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e))).toEqual([]);
  });
});

test("PRE-10 · Filtro por categoría", async ({ page }) => {
  await insertar("price_items", [
    precio({ name: "Service 1" }),
    precio({ name: "Clase 1", category: "clases", unit: "clase" }),
    precio({ name: "Clase 2", category: "clases", unit: "clase" }),
  ]);
  await abrirPrecios(page);
  await page.locator("#filtro-cat-precio").selectOption("clases");
  await expect.poll(async () => (await filas(page, "tabla-precios")).map((f) => f[0])).toEqual([
    "QA · Clase 1 | Clases", "QA · Clase 2 | Clases",
  ]);
});

test("PRE-11 · Borrar precio", async ({ page }) => {
  await insertar("price_items", precio({ name: "Para borrar" }));
  await abrirPrecios(page);
  const pregunta = responderConfirm(page, true);
  await page.locator("#tabla-precios").getByRole("button", { name: "Borrar" }).click();
  expect(await pregunta).toBe("¿Borrar este precio de la lista?");
  await esperarToast(page, "Precio borrado.");
  await expect.poll(() => filas(page, "tabla-precios")).toEqual([]);
  expect(await leer("price_items")).toHaveLength(0);
});

test("PRE-12 · Números de arriba", async ({ page }) => {
  await insertar("price_items", precio({ category: "sistemas", unit: "hora", name: "Hora" }));
  const presu = (datos) => ({ category: "sistemas", date: hoyAR(), ...datos });
  await insertar("quotes", [
    presu({ title: "Aceptado", status: "aceptado", list_price: 100000, final_price: 100000, hours_real: 4 }),
    presu({ title: "Enviado", status: "enviado", list_price: 50000, final_price: 50000 }),
    presu({ title: "Borrador", status: "borrador", list_price: 30000, final_price: 30000 }),
  ]);
  await abrirPrecios(page);
  const horaReal = page.locator("#kpi-hora-real");
  await expect(horaReal).toHaveText(pesos(25000));
  expect(await color(horaReal)).toBe(LIMA);
  await expect(page.locator("#kpi-hora-real-sub")).toHaveText("1 presupuesto · 4 h");
  await expect(page.locator("#kpi-aceptado")).toHaveText(pesos(100000));
  await expect(page.locator("#kpi-aceptado-sub")).toHaveText(normal(`1 aceptados · 2 en curso (${pesos(80000)})`));

  await test.step("con la hora real debajo de la tarifa, en rojo", async () => {
    // (100.000 + 20.000) / (4 + 10) h = 8.571 por hora
    await insertar("quotes", presu({ title: "Aceptado barato", status: "aceptado", list_price: 20000, final_price: 20000, hours_real: 10 }));
    await page.reload();
    await irA(page, "precios");
    await expect(horaReal).toHaveText(pesos(120000 / 14));
    expect(await color(horaReal)).toBe(ROJO);
    await expect(page.locator("#kpi-hora-real-sub")).toHaveText("2 presupuestos · 14 h");
    await expect(page.locator("#kpi-aceptado-sub")).toHaveText(normal(`2 aceptados · 2 en curso (${pesos(80000)})`));
  });
});

test("PRE-13 · Inflación y dólar", async ({ page }) => {
  await abrirPrecios(page);
  const mes = await page.evaluate((iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { month: "long" }), mesAtras(1, 28));
  await expect(page.locator("#kpi-ipc")).toHaveText("2%");
  await expect(page.locator("#kpi-dolar")).toHaveText(normal(`inflación de ${mes} · MEP ${pesos(1400)}`));
});

test.describe("con las APIs caídas", () => {
  test.use({ mercado: { ipc: null, mep: null } });

  test("PRE-14 · APIs caídas", async ({ page }) => {
    const errores = juntarErrores(page);
    await insertar("price_items", precio({ name: "Un precio", updated_on: mesAtras(1, 10) }));
    await abrirPrecios(page);
    await expect(page.locator("#kpi-dolar")).toHaveText("sin datos de inflación");
    await expect(page.locator("#kpi-ipc")).toHaveText("—");
    await expect.poll(async () => (await filas(page, "tabla-precios"))[0][3]).toBe("—");
    await expect(toast(page)).not.toHaveClass(/show/);
    // Los únicos errores son los de las dos APIs que no respondieron (los anota el navegador).
    expect(errores.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e))).toEqual([]);
  });
});

test("PRE-15 · Precios de mercado", async ({ page }) => {
  await abrirPrecios(page);
  const cantidad = await page.evaluate(() => window.REFERENCIAS_MERCADO.items.length);
  await expect(page.locator("#tabla-referencias tr")).toHaveCount(cantidad);
  await expect(page.locator("#ref-revisado")).toHaveText("revisado el 12/9/2026");
  const lista = await filas(page, "tabla-referencias");
  expect(lista[0]).toEqual([
    "Diagnóstico / revisión | Service · Freelance / con local",
    `${pesos(12986)} – ${pesos(22262)} | por trabajo`,
    "Paraná",
    "Vida Informática | 2026-09",
  ]);
  // Referencia en dólares, pasada a pesos al MEP fijo de $ 1.400.
  expect(lista.find((f) => f[0].startsWith("Hora de desarrollo"))[1]).toBe(
    `${pesos(28000)} – ${pesos(42000)} (USD 20–30) | por hora`
  );
  const links = page.locator("#tabla-referencias a");
  await expect(links).toHaveCount(cantidad);
  for (const a of await links.all()) {
    await expect(a).toHaveAttribute("target", "_blank");
    await expect(a).toHaveAttribute("href", /^https:\/\//);
  }
});
