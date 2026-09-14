// Antes de correr: entra una vez con el usuario de prueba y revisa que la cuenta sólo tenga datos de prueba.
import { iniciarSesionApi, filasAjenas, limpiar, EMAIL } from "./ayuda.js";

export default async function globalSetup() {
  const sesion = await iniciarSesionApi();
  // Los tests la leen de acá (Playwright pasa las variables de entorno a los workers).
  process.env.PANEL_QA_SESION = JSON.stringify(sesion);

  const ajenas = await filasAjenas();
  if (ajenas.length) {
    throw new Error(
      `La cuenta ${EMAIL} tiene filas que no son de prueba (${ajenas.join(", ")}). ` +
        "Los tests sólo corren con el usuario de prueba: revisá PANEL_QA_EMAIL en .env.local."
    );
  }
  await limpiar();
}
