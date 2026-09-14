// I. Datos del board (sprint 02): los .sql ordenados, las tablas nuevas, lo que la base hace sola,
// la seguridad y qué pasa al borrar. Casi todo habla directo con la base (la misma API que usa el
// panel), con el usuario de prueba.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  test, expect, abrirPanel, esperarToast, hoyAR, insertar, irA, leer, modal, qa, rest, sesionCompartida,
  SUPABASE_URL, ANON_KEY,
} from "../ayuda.js";

const raiz = (ruta) => fileURLToPath(new URL(`../../${ruta}`, import.meta.url));
const OTRO = "00000000-0000-4000-8000-000000000000"; // un owner_id que no es de nadie
const TABLAS_NUEVAS = ["sprints", "tasks", "task_events", "qa_cases", "qa_runs", "bugs", "journal"];

const proyecto = (extra = {}) => insertar("projects", { name: "Proyecto board", ...extra });
const tarea = (project_id, extra = {}) => insertar("tasks", { project_id, titulo: "Tarea", ...extra });
const cambiar = async (tabla, id, datos) => (await rest("PATCH", `${tabla}?id=eq.${id}`, datos))[0];
const mover = (id, estado) => cambiar("tasks", id, { estado });
const unaTarea = async (id) => (await leer("tasks", `id=eq.${id}`))[0];
const eventos = async (task_id) =>
  (await leer("task_events", `task_id=eq.${task_id}&order=id`)).map((e) => [e.estado_anterior, e.estado_nuevo]);
const ultimoMov = async (id) => new Date((await leer("projects", `id=eq.${id}`))[0].ultimo_movimiento).getTime();
const ms = (iso) => new Date(iso).getTime();
const rechaza = (pedido) => expect(pedido).rejects.toThrow();
const reciente = (iso) => expect(Math.abs(ms(iso) - Date.now())).toBeLessThan(60_000);

// Una fila en cada tabla nueva, todas colgando del mismo proyecto.
async function unoDeCada() {
  const p = await proyecto();
  const sprint = await insertar("sprints", { project_id: p.id, numero: 1, nombre: "Sprint" });
  const t = await tarea(p.id, { sprint_id: sprint.id });
  const caso = await insertar("qa_cases", { project_id: p.id, titulo: "Caso" });
  const corrida = await insertar("qa_runs", { qa_case_id: caso.id, task_id: t.id, resultado: "pasa" });
  const bug = await insertar("bugs", { project_id: p.id, task_origen: t.id, titulo: "Bug" });
  const entrada = await insertar("journal", { project_id: p.id, texto: "Entrada" });
  return { p, sprint, t, caso, corrida, bug, entrada };
}

// ---------- A. Los .sql ordenados ----------

test("MIG-01 · Archivos numerados", () => {
  const sql = readdirSync(raiz("supabase")).filter((f) => f.endsWith(".sql")).sort();
  expect(sql).toEqual(["001-proyectos-y-movimientos.sql", "002-precios.sql", "003-presupuestos-pdf.sql", "004-board.sql"]);
  // En la base de conocimiento, la lista en orden es la de la sección 6 (Modelo de datos).
  for (const [doc, seccion] of [["supabase/SETUP.md", "## 2."], ["BASE-CONOCIMIENTO.md", "## 6."]]) {
    const texto = readFileSync(raiz(doc), "utf8");
    const desde = texto.indexOf(seccion);
    const posiciones = sql.map((f) => texto.indexOf(f, desde));
    expect(posiciones.every((p) => p >= 0), `${doc} nombra los cuatro`).toBe(true);
    expect([...posiciones].sort((a, b) => a - b), `${doc} los nombra en orden`).toEqual(posiciones);
  }
});

test("MIG-05 · Avisos con el nombre nuevo", async ({ page }) => {
  // Ningún archivo del panel nombra los .sql viejos (incluye el aviso al guardar un presupuesto).
  const panel = raiz("public/panel");
  for (const archivo of readdirSync(panel, { recursive: true }).filter((f) => /\.(js|html)$/.test(f))) {
    expect(readFileSync(join(panel, archivo), "utf8"), archivo).not.toMatch(/supabase\/(schema|precios|presupuestos-pdf)\.sql/);
  }

  // Falta la tabla de precios.
  const cors = { "Access-Control-Allow-Origin": "*" };
  await page.route("**/rest/v1/price_items*", (route) =>
    route.fulfill({ status: 404, headers: cors, json: { code: "PGRST205", message: "Could not find the table 'public.price_items' in the schema cache" } })
  );
  await abrirPanel(page);
  await irA(page, "precios");
  await expect(page.locator("#precios-setup")).toBeVisible();
  await expect(page.locator("#precios-setup")).toContainText("supabase/002-precios.sql");
  await page.unroute("**/rest/v1/price_items*");

  // Falta la columna doc: los presupuestos llegan sin ella.
  await insertar("quotes", { title: "Sin doc", category: "service", date: hoyAR(), status: "borrador", final_price: 1000 });
  await page.route("**/rest/v1/quotes*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const r = await route.fetch();
    await route.fulfill({ response: r, json: (await r.json()).map(({ doc, ...q }) => q) });
  });
  await page.reload();
  await irA(page, "precios");
  await expect(page.locator("#presu-doc-setup")).toBeVisible();
  await expect(page.locator("#presu-doc-setup")).toContainText("supabase/003-presupuestos-pdf.sql");
});

// ---------- B. Estructura de las tablas ----------

test("DAT-01 · Proyecto nuevo con valores por defecto", async ({ page }) => {
  await abrirPanel(page);
  await irA(page, "proyectos");
  await page.getByRole("button", { name: "+ Nuevo proyecto" }).click();
  await modal(page).locator('[name="name"]').fill(qa("Proyecto con pulso"));
  await modal(page).locator('[name="start_date"]').fill(hoyAR()); // sin fecha no se guarda (E-01)
  await modal(page).getByRole("button", { name: "Guardar" }).click();
  await esperarToast(page, "Proyecto creado.");
  const [p] = await leer("projects");
  expect(p).toMatchObject({ pulso: "andando", tipo: "cliente", proximo_paso: null, bloqueante: null, repo_url: null, prod_url: null });
  reciente(p.ultimo_movimiento);
});

test("DAT-03 · Valores que no existen", async () => {
  const { p, sprint, t, caso } = await unoDeCada();
  await rechaza(cambiar("projects", p.id, { pulso: "tranqui" }));
  await rechaza(cambiar("projects", p.id, { tipo: "otro" }));
  await rechaza(cambiar("sprints", sprint.id, { estado: "abierto" }));
  await rechaza(cambiar("tasks", t.id, { tipo: "mejora" }));
  await rechaza(mover(t.id, "hecha"));
  await rechaza(cambiar("tasks", t.id, { prioridad: "urgente" }));
  await rechaza(insertar("bugs", { project_id: p.id, titulo: "Bug grave", severidad: "grave" }));
  await rechaza(insertar("bugs", { project_id: p.id, titulo: "Bug resuelto", estado: "resuelto" }));
  await rechaza(insertar("qa_runs", { qa_case_id: caso.id, resultado: "ok" }));
  for (const estado of ["todo", "doing", "blocked", "qa", "ready", "done", "backlog"]) {
    expect((await mover(t.id, estado)).estado).toBe(estado);
  }
});

test("DAT-04 · Tarea nueva con valores por defecto", async () => {
  const p = await proyecto();
  const t = await tarea(p.id);
  expect(t).toMatchObject({ estado: "backlog", prioridad: "media", tipo: "feature", sprint_id: null, empezada: null, pasada_a_qa: null, cerrada: null });
  reciente(t.creada);
});

test("DAT-05 · Tarea sin proyecto o sin título", async () => {
  const p = await proyecto();
  await rechaza(insertar("tasks", { titulo: "Sin proyecto" }));
  await rechaza(rest("POST", "tasks", { project_id: p.id })); // sin título (insertar le pondría uno)
  expect(await leer("tasks")).toHaveLength(0);
});

test("DAT-06 · Un solo sprint activo", async () => {
  const p1 = await proyecto();
  const p2 = await proyecto({ name: "Otro proyecto" });
  await insertar("sprints", { project_id: p1.id, numero: 1, nombre: "Uno", estado: "activo" });
  await rechaza(insertar("sprints", { project_id: p1.id, numero: 2, nombre: "Dos", estado: "activo" }));
  await insertar("sprints", { project_id: p1.id, numero: 3, nombre: "Tres", estado: "planeado" });
  await insertar("sprints", { project_id: p2.id, numero: 1, nombre: "Activo de otro", estado: "activo" });
  expect(await leer("sprints")).toHaveLength(3);
});

test("DAT-07 · Número de sprint único", async () => {
  const p1 = await proyecto();
  const p2 = await proyecto({ name: "Otro proyecto" });
  await insertar("sprints", { project_id: p1.id, numero: 1, nombre: "Uno" });
  await rechaza(insertar("sprints", { project_id: p1.id, numero: 1, nombre: "Uno repetido" }));
  await insertar("sprints", { project_id: p2.id, numero: 1, nombre: "Uno de otro" });
});

test("DAT-08 · DAT-09 · Bitácora con la fecha de hoy y sin proyecto", async () => {
  const entrada = await insertar("journal", { texto: "Sin fecha ni proyecto" });
  expect(entrada.fecha).toBe(hoyAR());
  expect(entrada.project_id).toBeNull();
});

// ---------- C. Lo que la base hace sola ----------

test("TRG-01 · Alta de una tarea", async () => {
  const t = await tarea((await proyecto()).id);
  expect(await eventos(t.id)).toEqual([[null, "backlog"]]);
  const [e] = await leer("task_events", `task_id=eq.${t.id}`);
  reciente(e.fecha);
});

test("TRG-02 · Cambios de estado", async () => {
  const t = await tarea((await proyecto()).id);
  expect(await mover(t.id, "todo")).toMatchObject({ empezada: null, pasada_a_qa: null, cerrada: null });
  const enDoing = await mover(t.id, "doing");
  reciente(enDoing.empezada);
  const enQa = await mover(t.id, "qa");
  reciente(enQa.pasada_a_qa);
  expect(enQa.empezada).toBe(enDoing.empezada);
  expect((await mover(t.id, "ready")).cerrada).toBeNull();
  reciente((await mover(t.id, "done")).cerrada);
  expect(await eventos(t.id)).toEqual([
    [null, "backlog"], ["backlog", "todo"], ["todo", "doing"], ["doing", "qa"], ["qa", "ready"], ["ready", "done"],
  ]);
});

test("TRG-03 · Editar sin cambiar de estado", async () => {
  const t = await tarea((await proyecto()).id);
  await cambiar("tasks", t.id, { titulo: qa("Otro título"), prioridad: "alta", detalle: "Más detalle" });
  expect(await eventos(t.id)).toEqual([[null, "backlog"]]);
});

test("TRG-04 · Volver atrás", async () => {
  const t = await tarea((await proyecto()).id);
  const primera = await mover(t.id, "doing");
  await mover(t.id, "qa");
  const primerCierre = await mover(t.id, "done");
  const reabierta = await mover(t.id, "doing");
  expect(reabierta.cerrada).toBeNull();
  expect(reabierta.empezada).toBe(primera.empezada);
  const segundaQa = await mover(t.id, "qa");
  expect(ms(segundaQa.pasada_a_qa)).toBeGreaterThan(ms(primerCierre.pasada_a_qa));
  const final = await mover(t.id, "done");
  expect(final.empezada).toBe(primera.empezada);
  expect(ms(final.cerrada)).toBeGreaterThan(ms(primerCierre.cerrada));
});

test("TRG-05 · Tareas trabadas", async () => {
  const t = await tarea((await proyecto()).id);
  const empezada = (await mover(t.id, "doing")).empezada;
  await mover(t.id, "blocked");
  expect((await mover(t.id, "doing")).empezada).toBe(empezada);
  expect(await eventos(t.id)).toEqual([[null, "backlog"], ["backlog", "doing"], ["doing", "blocked"], ["blocked", "doing"]]);
});

test("TRG-06 · Último movimiento del proyecto", async () => {
  const p = await proyecto();
  const t = await tarea(p.id);
  const caso = await insertar("qa_cases", { project_id: p.id, titulo: "Caso" });
  const acciones = [
    ["crear una tarea", () => tarea(p.id, { titulo: "Otra tarea" })],
    ["cambiar el estado", () => mover(t.id, "doing")],
    ["crear un sprint", () => insertar("sprints", { project_id: p.id, numero: 1, nombre: "Sprint" })],
    ["cargar un bug", () => insertar("bugs", { project_id: p.id, titulo: "Bug" })],
    ["correr un caso de QA", () => insertar("qa_runs", { qa_case_id: caso.id, resultado: "pasa" })],
    ["escribir en la bitácora", () => insertar("journal", { project_id: p.id, texto: "Hoy avancé" })],
    ["cambiar el pulso", () => cambiar("projects", p.id, { pulso: "en_llamas" })],
    ["cambiar el próximo paso", () => cambiar("projects", p.id, { proximo_paso: "Mandar el presupuesto" })],
    ["cambiar el bloqueante", () => cambiar("projects", p.id, { bloqueante: "Falta que contesten" })],
  ];
  for (const [que, hacer] of acciones) {
    const antes = await ultimoMov(p.id);
    await hacer();
    expect(await ultimoMov(p.id), que).toBeGreaterThan(antes);
  }
});

test("TRG-07 · Lo que no es movimiento de trabajo", async () => {
  const p = await proyecto();
  const acciones = [
    ["cargar un ingreso", () => insertar("transactions", { type: "ingreso", amount: 1000, date: hoyAR(), project_id: p.id, description: "Cobro" })],
    ["cambiar el nombre y el cliente", () => cambiar("projects", p.id, { name: qa("Nombre nuevo"), client_name: "Otro cliente" })],
    ["escribir en la bitácora sin proyecto", () => insertar("journal", { texto: "Suelta" })],
  ];
  for (const [que, hacer] of acciones) {
    const antes = await ultimoMov(p.id);
    await hacer();
    expect(await ultimoMov(p.id), que).toBe(antes);
  }
});

test("TRG-08 · Tareas en QA", async () => {
  const p = await proyecto();
  const [a, b, c] = [await tarea(p.id, { titulo: "A" }), await tarea(p.id, { titulo: "B" }), await tarea(p.id, { titulo: "C" })];
  await mover(a.id, "qa");
  await mover(b.id, "qa");
  await mover(c.id, "done");
  const cola = await leer("tasks", "estado=eq.qa&order=pasada_a_qa");
  expect(cola.map((t) => t.id)).toEqual([a.id, b.id]);
});

test("TRG-09 · Bug en QA: la tarea vuelve", async () => {
  const p = await proyecto();
  const t = await tarea(p.id);
  await mover(t.id, "qa");
  const bug = await insertar("bugs", { project_id: p.id, task_origen: t.id, titulo: "No guarda" });
  expect(bug.estado).toBe("abierto");
  expect((await unaTarea(t.id)).estado).toBe("doing");
  expect((await eventos(t.id)).at(-1)).toEqual(["qa", "doing"]);
});

test("TRG-10 · Bug de una tarea que no está en QA", async () => {
  const p = await proyecto();
  for (const estado of ["doing", "ready", "done"]) {
    const t = await tarea(p.id, { titulo: `En ${estado}` });
    await mover(t.id, estado);
    const antes = await eventos(t.id);
    await insertar("bugs", { project_id: p.id, task_origen: t.id, titulo: `Bug en ${estado}` });
    expect((await unaTarea(t.id)).estado, estado).toBe(estado);
    expect(await eventos(t.id), estado).toEqual(antes);
  }
});

test("TRG-11 · El ciclo completo", async () => {
  const p = await proyecto();
  const t = await tarea(p.id);
  await mover(t.id, "doing");
  const primeraQa = (await mover(t.id, "qa")).pasada_a_qa;
  const bug = await insertar("bugs", { project_id: p.id, task_origen: t.id, titulo: "Falla en QA" });
  await cambiar("bugs", bug.id, { estado: "cerrado" });
  const segundaQa = (await mover(t.id, "qa")).pasada_a_qa;
  await mover(t.id, "ready");
  await mover(t.id, "done");
  expect((await eventos(t.id)).slice(3)).toEqual([["qa", "doing"], ["doing", "qa"], ["qa", "ready"], ["ready", "done"]]);
  expect(ms(segundaQa)).toBeGreaterThan(ms(primeraQa));
  expect((await unaTarea(t.id)).pasada_a_qa).toBe(segundaQa);
});

test("TRG-12 · Cierre de un bug", async () => {
  const p = await proyecto();
  const bug = await insertar("bugs", { project_id: p.id, titulo: "Bug" });
  expect(bug.cerrado_en).toBeNull();
  reciente(bug.encontrado_en);
  const cerrado = await cambiar("bugs", bug.id, { estado: "cerrado" });
  reciente(cerrado.cerrado_en);
  expect((await cambiar("bugs", bug.id, { titulo: qa("Bug con otro título") })).cerrado_en).toBe(cerrado.cerrado_en);
  expect((await cambiar("bugs", bug.id, { estado: "a_reverificar" })).cerrado_en).toBeNull();
  reciente((await insertar("bugs", { project_id: p.id, titulo: "Ya cerrado", estado: "cerrado" })).cerrado_en);
});

test("TRG-13 · Las fechas del ciclo no se cargan a mano", async () => {
  const VIEJA = "2020-01-01T00:00:00+00:00";
  const p = await proyecto({ ultimo_movimiento: VIEJA });
  reciente((await leer("projects", `id=eq.${p.id}`))[0].ultimo_movimiento);
  const t = await tarea(p.id, { creada: VIEJA, empezada: VIEJA, pasada_a_qa: VIEJA, cerrada: VIEJA });
  expect(t).toMatchObject({ empezada: null, pasada_a_qa: null, cerrada: null });
  reciente(t.creada);
  expect(await cambiar("tasks", t.id, { empezada: VIEJA, cerrada: VIEJA })).toMatchObject({ empezada: null, cerrada: null });
  const antes = await ultimoMov(p.id);
  await cambiar("projects", p.id, { ultimo_movimiento: VIEJA });
  expect(await ultimoMov(p.id)).toBe(antes);
  const bug = await insertar("bugs", { project_id: p.id, titulo: "Abierto", cerrado_en: VIEJA });
  expect(bug.cerrado_en).toBeNull();
});

// ---------- D. Seguridad ----------

test("SEG-02 · Solo lo tuyo", async () => {
  await unoDeCada();
  const yo = sesionCompartida().user.id;
  for (const tabla of TABLAS_NUEVAS) {
    const filas = await leer(tabla);
    expect(filas.length, tabla).toBeGreaterThan(0);
    expect(filas.every((f) => f.owner_id === yo), tabla).toBe(true);
  }
});

test("SEG-03 · Sin sesión no se ve nada", async () => {
  await unoDeCada();
  for (const tabla of TABLAS_NUEVAS) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } });
    if (r.ok) expect(await r.json(), tabla).toEqual([]);
  }
});

test("SEG-04 · No se puede cargar a nombre de otro", async () => {
  const { p, t, caso } = await unoDeCada();
  const ajenas = {
    sprints: { project_id: p.id, numero: 9, nombre: "Ajeno" },
    tasks: { project_id: p.id, titulo: "Ajena" },
    qa_cases: { project_id: p.id, titulo: "Ajeno" },
    qa_runs: { qa_case_id: caso.id, task_id: t.id, resultado: "pasa" },
    bugs: { project_id: p.id, titulo: "Ajeno" },
    journal: { texto: "Ajena" },
  };
  for (const [tabla, fila] of Object.entries(ajenas)) {
    await rechaza(insertar(tabla, { ...fila, owner_id: OTRO }));
  }
});

test("SEG-05 · Los eventos no se tocan a mano", async () => {
  const t = await tarea((await proyecto()).id);
  const [evento] = await leer("task_events", `task_id=eq.${t.id}`);
  await rechaza(rest("POST", "task_events", { task_id: t.id, estado_nuevo: "done" }));
  await rechaza(rest("PATCH", `task_events?id=eq.${evento.id}`, { estado_nuevo: "done" }));
  await rechaza(rest("DELETE", `task_events?id=eq.${evento.id}`));
  expect(await eventos(t.id)).toEqual([[null, "backlog"]]);
});

// ---------- E. Borrar ----------

test("BOR-01 · Borrar un proyecto", async () => {
  const { p, sprint, t, caso, corrida, bug, entrada } = await unoDeCada();
  const mov = await insertar("transactions", { type: "egreso", amount: 500, date: hoyAR(), project_id: p.id, description: "Gasto" });
  await rest("DELETE", `projects?id=eq.${p.id}`);
  for (const [tabla, id] of [["sprints", sprint.id], ["tasks", t.id], ["qa_cases", caso.id], ["qa_runs", corrida.id], ["bugs", bug.id]]) {
    expect(await leer(tabla, `id=eq.${id}`), tabla).toEqual([]);
  }
  expect(await leer("task_events", `task_id=eq.${t.id}`)).toEqual([]);
  expect((await leer("journal", `id=eq.${entrada.id}`))[0].project_id).toBeNull();
  expect((await leer("transactions", `id=eq.${mov.id}`))[0].project_id).toBeNull();
});

test("BOR-02 · Borrar un sprint", async () => {
  const p = await proyecto();
  const sprint = await insertar("sprints", { project_id: p.id, numero: 1, nombre: "Sprint" });
  const a = await tarea(p.id, { titulo: "A", sprint_id: sprint.id, estado: "todo" });
  const b = await tarea(p.id, { titulo: "B", sprint_id: sprint.id, estado: "doing" });
  await rest("DELETE", `sprints?id=eq.${sprint.id}`);
  expect(await unaTarea(a.id)).toMatchObject({ sprint_id: null, project_id: p.id, estado: "todo" });
  expect(await unaTarea(b.id)).toMatchObject({ sprint_id: null, project_id: p.id, estado: "doing" });
});

test("BOR-03 · Borrar una tarea", async () => {
  const { t, corrida, bug } = await unoDeCada();
  await rest("DELETE", `tasks?id=eq.${t.id}`);
  expect(await leer("task_events", `task_id=eq.${t.id}`)).toEqual([]);
  expect((await leer("bugs", `id=eq.${bug.id}`))[0].task_origen).toBeNull();
  expect((await leer("qa_runs", `id=eq.${corrida.id}`))[0].task_id).toBeNull();
});

test("BOR-04 · Borrar un caso de QA", async () => {
  const { caso, t } = await unoDeCada();
  await insertar("qa_runs", { qa_case_id: caso.id, task_id: t.id, resultado: "falla" });
  expect(await leer("qa_runs", `qa_case_id=eq.${caso.id}`)).toHaveLength(2);
  await rest("DELETE", `qa_cases?id=eq.${caso.id}`);
  expect(await leer("qa_runs", `qa_case_id=eq.${caso.id}`)).toEqual([]);
});
