// A. Entrada y sesión
import {
  test, expect, EMAIL, PANEL, PIN_KEY, abrirPanel, activarPin, entrarConContrasena, esperarDatos,
  esperarToast, iniciarSesionApi, modal, responderConfirm,
} from "../ayuda.js";

const login = (page) => page.locator("#login-form");
const pinForm = (page) => page.locator("#pin-form");
const pinGuardado = (page) => page.evaluate((k) => localStorage.getItem(k), PIN_KEY);

test("LOG-02 · Contraseña incorrecta", async ({ page }) => {
  await entrarConContrasena(page, { password: "no-es-la-contraseña" });
  await expect(page.locator("#login-error")).toHaveText("Email o contraseña incorrectos.");
  await expect(login(page)).toBeVisible();
  await expect(page.locator("#app-view")).toBeHidden();
  await expect(page.locator("#login-btn")).toHaveText("Entrar");
});

test("LOG-01 · LOG-03 · LOG-04 · Entrar, recargar y salir", async ({ page }) => {
  await test.step("LOG-01 · Entrar con contraseña", async () => {
    await entrarConContrasena(page);
    await esperarDatos(page);
    await expect(page.locator("#view-resumen")).toHaveClass(/active/);
    await expect(page.locator("#user-email")).toHaveText(EMAIL);
    await expect(page.locator("#pin-toggle-btn")).toHaveText("Activar PIN");
    await expect(page.locator("#logout-btn")).toHaveText("Salir");
    await expect(modal(page)).toHaveCount(0);
  });
  await test.step("LOG-03 · La sesión queda abierta", async () => {
    await page.reload();
    await esperarDatos(page);
    await expect(page.locator("#login-view")).toBeHidden();
  });
  await test.step("LOG-04 · Salir", async () => {
    await page.locator("#logout-btn").click();
    await expect(login(page)).toBeVisible();
    await expect(page.locator("#app-view")).toBeHidden();
    await page.reload();
    await expect(login(page)).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#app-view")).toBeHidden();
  });
});

test("PIN-01 · PIN-02 · Activar PIN al entrar y validar el PIN nuevo", async ({ page }) => {
  await test.step("PIN-01 · Activar PIN al entrar", async () => {
    await entrarConContrasena(page, { pin: true });
    await expect(modal(page).getByRole("heading", { name: "Entrada rápida con PIN" })).toBeVisible();
  });
  const pin = modal(page).locator('input[name="pin"]');
  const pin2 = modal(page).locator('input[name="pin2"]');
  const activar = modal(page).getByRole("button", { name: "Activar" });
  const error = modal(page).locator("#pin-nuevo-error");

  // E-04: el mensaje del panel ("Tienen que ser de 4 a 6 números.") no llega a salir. El campo tiene
  // pattern="[0-9]{4,6}" y el navegador frena el envío antes, con su propio aviso.
  await test.step("PIN-02 · PIN de 2 números (así anda hoy, ver E-04)", async () => {
    await pin.fill("12");
    await pin2.fill("12");
    await activar.click();
    expect(await pin.evaluate((el) => el.validity.patternMismatch)).toBe(true);
    await expect(error).toBeHidden();
    await expect(modal(page)).toBeVisible();
  });
  await test.step("PIN-02 · Los dos PIN no coinciden", async () => {
    await pin.fill("1234");
    await pin2.fill("1235");
    await activar.click();
    await expect(error).toHaveText("Los dos PIN no coinciden.");
  });
  await test.step("PIN-02 · PIN correcto", async () => {
    await pin2.fill("1234");
    await activar.click();
    await expect(modal(page)).toHaveCount(0);
    await esperarToast(page, "Listo: la próxima vez entrás con tu PIN.");
    await expect(page.locator("#pin-toggle-btn")).toHaveText("Quitar PIN");
    await expect(page.locator("#logout-btn")).toHaveText("Bloquear");
  });
});

test("PIN-03 · Ahora no", async ({ page }) => {
  await abrirPanel(page);
  await page.locator("#pin-toggle-btn").click();
  await modal(page).getByRole("button", { name: "Ahora no" }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect(page.locator("#pin-toggle-btn")).toHaveText("Activar PIN");
  await expect(page.locator("#logout-btn")).toHaveText("Salir");
  expect(await pinGuardado(page)).toBeNull();
});

// Este test renueva la sesión con Supabase (entrar con PIN lo hace): usa una sesión propia para no
// gastar la que comparten los demás.
test("PIN-04 · PIN-06 · PIN-07 · Entrar con PIN, recargar y bloquear", async ({ page, context }) => {
  await abrirPanel(page, { sesion: await iniciarSesionApi() });
  await activarPin(page, "1234");

  const otra = await context.newPage();
  await test.step("PIN-04 · Entrar con PIN", async () => {
    await otra.goto(PANEL);
    await expect(pinForm(otra)).toBeVisible();
    await expect(login(otra)).toBeHidden();
    await otra.locator("#pin").fill("1234"); // sin tocar Entrar
    await esperarDatos(otra);
  });
  await test.step("PIN-06 · Recargar con la pestaña desbloqueada", async () => {
    await otra.reload();
    await esperarDatos(otra);
    await expect(pinForm(otra)).toBeHidden();
  });
  await test.step("PIN-07 · Bloquear", async () => {
    await otra.locator("#logout-btn").click();
    await expect(pinForm(otra)).toBeVisible();
    await expect(otra.locator("#app-view")).toBeHidden();
    await otra.locator("#pin").fill("1234");
    await esperarDatos(otra);
  });
});

test("PIN-05 · PIN incorrecto y bloqueo", async ({ page, context }) => {
  await abrirPanel(page);
  await activarPin(page, "1234");
  const otra = await context.newPage();
  await otra.goto(PANEL);
  await expect(pinForm(otra)).toBeVisible();

  const error = otra.locator("#pin-error");
  for (const quedan of ["quedan 4 intentos", "quedan 3 intentos", "quedan 2 intentos", "queda 1 intento"]) {
    await otra.locator("#pin").fill("9999");
    await expect(error).toHaveText(`PIN incorrecto. Te ${quedan}.`);
  }
  await otra.locator("#pin").fill("9999");
  await expect(login(otra)).toBeVisible();
  await expect(pinForm(otra)).toBeHidden();
  await expect(otra.locator("#login-error")).toHaveText("5 intentos fallidos: entrá con tu contraseña y elegí un PIN nuevo.");
  expect(await pinGuardado(otra)).toBeNull();
});

test("PIN-08 · Olvidé el PIN", async ({ page, context }) => {
  await abrirPanel(page);
  await activarPin(page);
  const otra = await context.newPage();
  await otra.goto(PANEL);
  await expect(pinForm(otra)).toBeVisible();
  await otra.getByRole("button", { name: "Entrar con email y contraseña" }).click();
  await expect(login(otra)).toBeVisible();
  await expect(otra.locator("#email")).toBeVisible();
  await expect(otra.locator("#password")).toBeVisible();
  await expect(pinForm(otra)).toBeHidden();
  expect(await pinGuardado(otra)).toBeNull();
});

test("PIN-09 · Quitar PIN", async ({ page }) => {
  await abrirPanel(page);
  await activarPin(page);
  const pregunta = responderConfirm(page, true);
  await page.locator("#pin-toggle-btn").click();
  expect(await pregunta).toBe("¿Quitar el PIN? El panel va a quedar abierto en este navegador hasta que toques Salir.");
  await esperarToast(page, "PIN quitado.");
  await expect(page.locator("#pin-toggle-btn")).toHaveText("Activar PIN");
  await expect(page.locator("#logout-btn")).toHaveText("Salir");
  expect(await pinGuardado(page)).toBeNull();
});

test.describe("en el celular", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("PIN-10 · PIN en el celular", async ({ page }) => {
    await abrirPanel(page);
    await expect(page.locator("#pin-toggle-btn")).toBeHidden();
    await expect(page.locator("#logout-btn")).toBeVisible();
  });
});
