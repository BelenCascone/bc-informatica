import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Email y contraseña del usuario de prueba (nunca el real): van en .env.local, que no se versiona.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "tests",
  // Todos los tests usan el mismo usuario de prueba: van de a uno para no pisarse los datos.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.js",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4173",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  // El mismo servidor que usa .claude/launch.json.
  webServer: { command: "npx vite --port 4173 --strictPort", port: 4173, reuseExistingServer: true },
});
