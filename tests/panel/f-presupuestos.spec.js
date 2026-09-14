// F. Presupuestos y PDF
import { plantilla } from "../../public/panel/presupuesto-doc.js";
import {
  test, expect, abrirPanel, esperarToast, fechaAR, filas, hoyAR, insertar, irA, leer, modal, normal, pesos, qa,
  responderConfirm, sumarDias,
} from "../ayuda.js";

const campo = (page, nombre) => modal(page).locator(`[name="${nombre}"]`);
const guardar = (page) => modal(page).getByRole("button", { name: "Guardar", exact: true }).click();
const guardarConPdf = (page) => modal(page).getByRole("button", { name: "Guardar y generar PDF" }).click();
const renglones = (page) => modal(page).locator("#presu-items .item-row");
const totales = async (page) => (await modal(page).locator("#presu-totales span").allTextContents()).map(normal);
const anio = hoyAR().slice(0, 4);

const precio = (datos) => ({ category: "service", unit: "trabajo", price: 20000, updated_on: hoyAR(), ...datos });
const tarifa = () => insertar("price_items", precio({ category: "sistemas", unit: "hora", name: "Hora" }));
const presu = (datos) => ({ category: "service", date: hoyAR(), status: "borrador", ...datos });

async function nuevoPresupuesto(page) {
  await abrirPanel(page);
  await irA(page, "precios");
  await page.getByRole("button", { name: "+ Nuevo presupuesto" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Nuevo presupuesto");
}

async function renglonEnBlanco(page, { concepto, cant, precio: monto }) {
  await modal(page).getByRole("button", { name: "+ Renglón en blanco" }).click();
  const fila = renglones(page).last();
  await fila.locator('[data-k="concepto"]').fill(concepto);
  if (cant !== undefined) await fila.locator('[data-k="cant"]').fill(String(cant));
  await fila.locator('[data-k="precio"]').fill(String(monto));
  return fila;
}

// Lo que se ve en la pestaña del PDF: el título, el Nº, el total y el resto del texto.
async function leerDocumento(ventana) {
  await expect(ventana.locator("h1.titulo")).toBeVisible();
  return {
    titulo: normal(await ventana.locator("h1.titulo").textContent()),
    datos: (await ventana.locator(".portada .dato").allTextContents()).map(normal),
    total: normal(await ventana.locator("tr.total .monto").textContent()),
    marca: await ventana.locator(".portada .marca .iso").count(),
    texto: normal(await ventana.locator("body").textContent()),
  };
}

test("PRS-01 · Nuevo presupuesto", async ({ page }) => {
  await insertar("quotes", presu({ title: "Anterior", final_price: 1000, doc: { numero: `${anio}-004`, items: [] } }));
  await nuevoPresupuesto(page);
  const t = plantilla("service");
  await expect(campo(page, "category")).toHaveValue("service");
  await expect(campo(page, "d_numero")).toHaveValue(`${anio}-005`);
  await expect(campo(page, "date")).toHaveValue(hoyAR());
  await expect(campo(page, "d_valida_hasta")).toHaveValue(sumarDias(hoyAR(), 7));
  await expect(campo(page, "status")).toHaveValue("borrador");
  await expect(campo(page, "d_propuesta_intro")).toHaveValue(t.propuesta_intro);
  await expect(campo(page, "includes")).toHaveValue(t.includes);
  await expect(campo(page, "d_no_incluye")).toHaveValue(t.no_incluye);
  await expect(campo(page, "d_plazos")).toHaveValue(t.plazos);
  await expect(campo(page, "d_condiciones")).toHaveValue(t.condiciones);
  await expect(campo(page, "d_cierre")).toHaveValue(t.cierre);
});

test("PRS-02 · Cambiar de categoría", async ({ page }) => {
  await nuevoPresupuesto(page);
  await campo(page, "d_no_incluye").fill("Lo escribí a mano");
  await campo(page, "category").selectOption("sistemas");
  const t = plantilla("sistemas");
  await expect(campo(page, "d_propuesta_intro")).toHaveValue(t.propuesta_intro);
  await expect(campo(page, "includes")).toHaveValue(t.includes);
  await expect(campo(page, "d_plazos")).toHaveValue(t.plazos);
  await expect(campo(page, "d_condiciones")).toHaveValue(t.condiciones);
  await expect(campo(page, "d_abono_incluye")).toHaveValue(t.abono_incluye);
  await expect(campo(page, "d_cierre")).toHaveValue(t.cierre);
  await expect(campo(page, "d_no_incluye")).toHaveValue("Lo escribí a mano");
  await expect(campo(page, "d_valida_hasta")).toHaveValue(sumarDias(hoyAR(), 15));
});

test("PRS-03 · Renglones de precio", async ({ page }) => {
  const ram = await insertar("price_items", precio({ name: "RAM", price: 30000 }));
  await nuevoPresupuesto(page);
  await modal(page).locator("#presu-agregar").selectOption(ram.id);
  await expect(renglones(page)).toHaveCount(1);
  await expect(renglones(page).first().locator('[data-k="concepto"]')).toHaveValue("QA · RAM");
  await expect(renglones(page).first().locator('[data-k="precio"]')).toHaveValue("30000");

  const blanco = await renglonEnBlanco(page, { concepto: "Mano de obra", cant: 2, precio: 10000 });
  await expect(blanco.locator(".importe")).toHaveText(pesos(20000));
  expect(await totales(page)).toEqual([normal(`Total ${pesos(50000)}`)]);

  await renglones(page).first().getByRole("button", { name: "Quitar renglón" }).click();
  await expect(renglones(page)).toHaveCount(1);
  await expect(renglones(page).first().locator('[data-k="concepto"]')).toHaveValue("Mano de obra");
  expect(await totales(page)).toEqual([normal(`Total ${pesos(20000)}`)]);
});

test("PRS-04 · Descuento", async ({ page }) => {
  await nuevoPresupuesto(page);
  await renglonEnBlanco(page, { concepto: "Trabajo", precio: 100000 });
  await campo(page, "d_descuento").fill("10");
  expect(await totales(page)).toEqual([
    normal(`Valor de lista ${pesos(100000)}`), normal(`Descuento − ${pesos(10000)}`), normal(`Total ${pesos(90000)}`),
  ]);
  await campo(page, "d_descuento_tipo").selectOption("monto");
  await campo(page, "d_descuento").fill("5000");
  expect(await totales(page)).toEqual([
    normal(`Valor de lista ${pesos(100000)}`), normal(`Descuento − ${pesos(5000)}`), normal(`Total ${pesos(95000)}`),
  ]);
  await expect(modal(page).locator("#presu-totales .total b")).toHaveCSS("color", "rgb(198, 255, 0)");
});

test("PRS-05 · Obligatorios", async ({ page }) => {
  await nuevoPresupuesto(page);
  await guardar(page);
  await esperarToast(page, "Poné el nombre del trabajo.");
  await campo(page, "title").fill(qa("Sin renglones"));
  await guardar(page);
  await esperarToast(page, "Agregá al menos un renglón en Precio.");
  await expect(modal(page)).toBeVisible();
  expect(await leer("quotes")).toHaveLength(0);
});

// Carga el presupuesto de ejemplo de PRS-06, PRS-07 y PRS-09: $ 100.000 con 10 % de descuento.
async function cargarNotebook(page) {
  await nuevoPresupuesto(page);
  await campo(page, "title").fill(qa("Notebook"));
  await campo(page, "client_name").fill("Cliente de prueba");
  await campo(page, "d_situacion").fill("Se apaga sola después de un rato.");
  await renglonEnBlanco(page, { concepto: "Service completo", precio: 100000 });
  await campo(page, "d_descuento").fill("10");
}

test("PRS-06 · Guardar", async ({ page }) => {
  await cargarNotebook(page);
  await guardar(page);
  await esperarToast(page, "Presupuesto guardado.");
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(() => filas(page, "tabla-presupuestos")).toEqual([[
    fechaAR(hoyAR()), `QA · Notebook | Nº ${anio}-001 · Service`, "Cliente de prueba",
    `${pesos(90000)} | lista ${pesos(100000)}`, "—", "borrador", "PDF Ver / editar Borrar",
  ]]);
  const [q] = await leer("quotes");
  expect([Number(q.list_price), Number(q.final_price), q.doc.numero]).toEqual([100000, 90000, `${anio}-001`]);
});

test("PRS-07 · Guardar y generar PDF", async ({ page }) => {
  await cargarNotebook(page);
  const pestaña = page.waitForEvent("popup");
  await guardarConPdf(page);
  const doc = await leerDocumento(await pestaña);
  await esperarToast(page, "Presupuesto guardado.");
  expect(doc.titulo).toBe("QA · Notebook");
  expect(doc.marca).toBe(1);
  expect(doc.datos).toContain(`Nº${anio}-001`);
  expect(doc.datos).toContain("Preparado paraCliente de prueba");
  expect(doc.total).toBe(pesos(90000));
  expect(doc.texto).toContain("Service completo");
  expect(doc.texto).toContain("Se apaga sola después de un rato.");
});

test("PRS-08 · Partes sin completar", async ({ page }) => {
  await nuevoPresupuesto(page);
  await campo(page, "title").fill(qa("Sistema"));
  await campo(page, "category").selectOption("sistemas");
  await renglonEnBlanco(page, { concepto: "Desarrollo", precio: 500000 });
  let pestañas = 0;
  page.on("popup", () => pestañas++);
  const pregunta = responderConfirm(page, false);
  await guardarConPdf(page);
  expect(await pregunta).toBe(
    "Quedan partes para completar: [qué pantallas y funciones lleva], [cuántas semanas].\n\n¿Generar el PDF igual?"
  );
  await expect(modal(page)).toBeVisible();
  expect(pestañas).toBe(0);
  expect(await leer("quotes")).toHaveLength(0);
});

test("PRS-09 · Volver a generar el PDF", async ({ page }) => {
  await cargarNotebook(page);
  const primera = page.waitForEvent("popup");
  await guardarConPdf(page);
  const original = await leerDocumento(await primera);
  await esperarToast(page, "Presupuesto guardado.");
  await expect(page.locator("#tabla-presupuestos tr")).toHaveCount(1);

  const segunda = page.waitForEvent("popup");
  await page.locator("#tabla-presupuestos").getByRole("button", { name: "PDF" }).click();
  const otra = await leerDocumento(await segunda);
  expect(otra).toEqual(original);
});

test("PRS-10 · Editar", async ({ page }) => {
  await insertar("quotes", presu({
    title: "Guardado", client_name: "Cliente", list_price: 20000, final_price: 15000, includes: "Incluye guardado",
    hours_estimated: 3, hours_real: 2, parts_cost: 1000, parts_paid_by: "cliente", reasoning: "Porque sí",
    doc: {
      numero: `${anio}-050`, valida_hasta: sumarDias(hoyAR(), 7), situacion: "Situación guardada", propuesta_intro: "Intro guardada",
      no_incluye: "No incluye guardado", plazos: "", condiciones: "Pago: contado", cierre: "Cierre guardado", abono_monto: null,
      abono_incluye: "", descuento_tipo: "monto", descuento: 5000, descuento_motivo: "Motivo guardado",
      items: [{ concepto: "Renglón 1", detalle: "Detalle 1", cant: 2, precio: 10000 }],
    },
  }));
  await abrirPanel(page);
  await irA(page, "precios");
  await page.locator("#tabla-presupuestos").getByRole("button", { name: "Ver / editar" }).click();
  await expect(modal(page).locator("h3")).toHaveText("Presupuesto");
  const esperado = {
    title: "QA · Guardado", client_name: "Cliente", d_numero: `${anio}-050`, d_situacion: "Situación guardada",
    d_propuesta_intro: "Intro guardada", includes: "Incluye guardado", d_no_incluye: "No incluye guardado",
    d_condiciones: "Pago: contado", d_cierre: "Cierre guardado", d_descuento: "5000", d_descuento_tipo: "monto",
    d_descuento_motivo: "Motivo guardado", hours_estimated: "3", hours_real: "2", parts_cost: "1000",
    parts_paid_by: "cliente", reasoning: "Porque sí",
  };
  for (const [nombre, valor] of Object.entries(esperado)) await expect(campo(page, nombre)).toHaveValue(valor);
  const fila = renglones(page).first();
  await expect(renglones(page)).toHaveCount(1);
  await expect(fila.locator('[data-k="concepto"]')).toHaveValue("Renglón 1");
  await expect(fila.locator('[data-k="detalle"]')).toHaveValue("Detalle 1");
  await expect(fila.locator('[data-k="cant"]')).toHaveValue("2");
  await expect(fila.locator('[data-k="precio"]')).toHaveValue("10000");

  await campo(page, "status").selectOption("enviado");
  await guardar(page);
  await esperarToast(page, "Presupuesto actualizado.");
  await expect(page.locator("#tabla-presupuestos .badge")).toHaveText("enviado");
  const [q] = await leer("quotes");
  expect([q.status, q.doc.numero, q.doc.situacion, Number(q.final_price)]).toEqual(["enviado", `${anio}-050`, "Situación guardada", 15000]);
});

test("PRS-11 · Horas y precio por hora", async ({ page }) => {
  await tarifa();
  await insertar("quotes", presu({ title: "Bien pago", list_price: 200000, final_price: 200000, hours_real: 8 }));
  await nuevoPresupuesto(page);
  await campo(page, "title").fill(qa("Mal pago"));
  await renglonEnBlanco(page, { concepto: "Trabajo", precio: 100000 });
  await modal(page).locator("details.interno summary").click();
  await campo(page, "hours_estimated").fill("10");
  await expect(modal(page).locator("#presu-refs")).toContainText(normal(`Con 10 h a tu tarifa de ${pesos(20000)} serían ${pesos(200000)}.`));
  await expect(modal(page).locator("#presu-calc")).toHaveText(normal(`${pesos(10000)} por hora estimada`));
  await campo(page, "hours_real").fill("8");
  await expect(modal(page).locator("#presu-calc")).toHaveText(normal(`${pesos(12500)} por hora real`));
  await guardar(page);
  await esperarToast(page, "Presupuesto guardado.");
  const pill = (titulo) => page.locator("#tabla-presupuestos tr", { hasText: titulo }).locator(".pill");
  await expect(pill("QA · Mal pago")).toHaveText(normal(`${pesos(12500)}/h`));
  await expect(pill("QA · Mal pago")).toHaveClass(/bajo/);
  await expect(pill("QA · Bien pago")).toHaveText(normal(`${pesos(25000)}/h`));
  await expect(pill("QA · Bien pago")).toHaveClass(/ok/);
});

test("PRS-12 · Aviso por hora baja", async ({ page }) => {
  await tarifa();
  await insertar("quotes", presu({ title: "Hora baja", status: "enviado", list_price: 50000, final_price: 50000, hours_real: 10 }));
  await abrirPanel(page);
  await irA(page, "precios");
  const aviso = page.locator("#lista-avisos li.bajo");
  await expect(aviso.locator(".ico")).toHaveText("Bajo");
  await expect(aviso.locator(".txt")).toHaveText(normal(
    `QA · Hora baja te quedó a ${pesos(5000)} la hora (${pesos(50000)} en 10 h), debajo de tu tarifa de ${pesos(20000)}.`
  ));
});

test("PRS-13 · Aviso por mucho descuento", async ({ page }) => {
  await insertar("quotes", presu({ title: "Con descuento", status: "aceptado", list_price: 100000, final_price: 80000 }));
  await abrirPanel(page);
  await irA(page, "precios");
  const aviso = page.locator("#lista-avisos li.bajo");
  await expect(aviso.locator(".ico")).toHaveText("Bajo");
  await expect(aviso.locator(".txt")).toHaveText(normal(
    `QA · Con descuento: cobraste ${pesos(80000)}, 20,0% menos que tu precio de lista (${pesos(100000)}).`
  ));
});

test("PRS-14 · Caso para la landing", async ({ page }) => {
  await nuevoPresupuesto(page);
  await campo(page, "title").fill(qa("Caso"));
  await renglonEnBlanco(page, { concepto: "Trabajo", precio: 50000 });
  await modal(page).locator("details.interno summary").click();
  await campo(page, "publishable").check();
  await guardar(page);
  await esperarToast(page, "Presupuesto guardado.");
  await expect.poll(async () => (await filas(page, "tabla-presupuestos"))[0]?.[1]).toBe(
    `QA · Caso | Nº ${anio}-001 · Service · caso para la landing`
  );
  expect((await leer("quotes"))[0].publishable).toBe(true);
});

test("PRS-15 · Filtro y borrar", async ({ page }) => {
  await insertar("quotes", [
    presu({ title: "Aceptado", status: "aceptado", final_price: 1000 }),
    presu({ title: "Borrador", status: "borrador", final_price: 1000 }),
  ]);
  await abrirPanel(page);
  await irA(page, "precios");
  await page.locator("#filtro-estado-presu").selectOption("aceptado");
  await expect.poll(async () => (await filas(page, "tabla-presupuestos")).map((f) => f[1])).toEqual(["QA · Aceptado | Service"]);
  const pregunta = responderConfirm(page, true);
  await page.locator("#tabla-presupuestos").getByRole("button", { name: "Borrar" }).click();
  expect(await pregunta).toBe("¿Borrar este presupuesto?");
  await esperarToast(page, "Presupuesto borrado.");
  await expect.poll(() => filas(page, "tabla-presupuestos")).toEqual([]);
  expect((await leer("quotes")).map((q) => q.title)).toEqual(["QA · Borrador"]);
});

// E-03: el fondo oscuro cierra el modal sin preguntar, y lo cargado se pierde.
test("E-03 · Tocar afuera de un modal lo cierra sin preguntar (así anda hoy)", async ({ page }) => {
  await nuevoPresupuesto(page);
  await campo(page, "title").fill(qa("Medio cargado"));
  let preguntas = 0;
  page.on("dialog", (d) => { preguntas++; d.dismiss(); });
  await page.locator("#active-modal").click({ position: { x: 5, y: 5 } });
  await expect(modal(page)).toHaveCount(0);
  expect(preguntas).toBe(0);
  expect(await leer("quotes")).toHaveLength(0);
});
