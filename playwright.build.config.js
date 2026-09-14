// EST-04: algunos casos contra el build de producción (npm run build + npm run preview).
import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

// Lo leen los tests que se portan distinto en el build (EST-03).
process.env.PANEL_BUILD = "1";

export default defineConfig({
  ...base,
  grep: /LOG-01|MOV-01|PRS-07|EST-02|EST-03/,
  use: { ...base.use, baseURL: "http://localhost:4174" },
  webServer: { command: "npx vite build && npx vite preview --port 4174 --strictPort", port: 4174, timeout: 120_000 },
});
