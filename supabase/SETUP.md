# Configurar el panel privado (una sola vez)

## 1. Crear el proyecto en Supabase
1. Entrá a https://supabase.com y creá una cuenta gratis (podés usar tu Google).
2. "New project" → elegí un nombre (ej. `bc-informatica`) y una contraseña de base de datos (guardala, no la vas a necesitar de nuevo pero por las dudas).
3. Esperá a que termine de crearse (1-2 minutos).

## 2. Crear las tablas
Los `.sql` de esta carpeta se corren **en orden de número**, uno por vez. Todos se pueden correr dos
veces sin romper nada.

| Archivo | Qué crea |
|---|---|
| [`001-proyectos-y-movimientos.sql`](./001-proyectos-y-movimientos.sql) | Tablas `projects` y `transactions` |
| [`002-precios.sql`](./002-precios.sql) | Tablas de la pestaña **Precios**: `price_items` y `quotes` |
| [`003-presupuestos-pdf.sql`](./003-presupuestos-pdf.sql) | Columna `quotes.doc`: el texto del PDF que se le manda al cliente |
| [`004-board.sql`](./004-board.sql) | Columnas nuevas de `projects` y las tablas del board: `sprints`, `tasks`, `task_events`, `qa_cases`, `qa_runs`, `bugs`, `journal`, con sus triggers |

Todas las tablas tienen seguridad por fila: cada dato solo lo ve y lo toca quien lo cargó.

**Cómo se corren.** Desde el sprint 02 se aplican con la herramienta de migraciones de Supabase
(desde Claude Code, con el conector de Supabase), para que quede el historial en **Database →
Migrations**. Si hace falta hacerlo a mano: **SQL Editor → New query**, pegar el archivo y **Run**;
en ese caso no queda en el historial.

Un `.sql` nuevo lleva el número siguiente y se escribe para poder correrse dos veces
(`if not exists`, `drop policy if exists` antes de `create policy`, `create or replace function`).

## 3. Crear tu usuario
1. Andá a **Authentication → Users → Add user → Create new user**.
2. Cargá tu email y una contraseña. Marcá **Auto Confirm User** para no tener que confirmar por mail.
3. Andá a **Authentication → Settings** (o **Providers → Email**) y desactivá **"Allow new users to sign up"** — así nadie más se puede registrar, solo entra quien vos crees a mano.

## 4. Conectar el panel
1. Andá a **Project Settings → API**.
2. Copiá el **Project URL** y la **anon public key**.
3. Abrí [`public/panel/config.js`](../public/panel/config.js) y reemplazá:
   ```js
   window.SUPABASE_CONFIG = {
     url: "https://tu-proyecto.supabase.co",
     anonKey: "tu-anon-key",
   };
   ```
   (Estos dos valores no son secretos — están pensados para usarse en el navegador. Lo que protege tus datos es la seguridad configurada en el paso 2.)

## 5. Listo
- El panel queda en `tusitio.com/panel`.
- Entrás con el email y contraseña que creaste en el paso 3.
- Desde **Proyectos** cargás tus trabajos, desde **Movimientos** tus ingresos y egresos, y en **Resumen** tenés el balance y el gráfico mensual.
- El panel vive en `public/panel/` para que Vite lo copie tal cual al build: si estuviera en la raíz, Vercel no lo publicaría.

## La pestaña Precios
- **Lista de precios**: lo que cobrás hoy por cada servicio y la fecha del último ajuste. Si pasaron los meses
  que marcaste en "Revisar cada" o la inflación publicada desde entonces llega al 5 %, aparece un aviso con el
  precio sugerido y un botón para aplicarlo.
- **Presupuestos**: qué cotizaste, qué incluía, por qué llegaste a ese precio, las horas y el estado. Con las
  horas reales calcula cuánto te quedó la hora y te avisa si quedó debajo de tu tarifa.
- **Precios de mercado**: salen de [`public/panel/referencias.js`](../public/panel/referencias.js). Son datos públicos
  y se actualizan a mano cuando se hace una búsqueda nueva. Cada precio de tu lista se compara con la referencia
  que elijas en "Comparar con".
- **Nuevo presupuesto** abre un formulario ya cargado según la categoría (qué incluye, qué no, plazos,
  condiciones) y los renglones de precio se eligen de tu lista. **Guardar y generar PDF** abre el presupuesto
  con la marca de BC en una pestaña nueva y el cuadro de impresión: elegí **Guardar como PDF** y listo para mandar.
  El botón **PDF** de cada fila lo vuelve a generar. Las plantillas de texto están en
  [`public/panel/presupuesto-doc.js`](../public/panel/presupuesto-doc.js).
- La inflación (INDEC) la trae de [ArgentinaDatos](https://argentinadatos.com) y el dólar MEP de
  [DolarAPI](https://dolarapi.com). Si alguna no responde, el panel anda igual y sólo faltan esos avisos.
- **Tus datos reales no van en este repo** (es público): los precios y presupuestos viven en Supabase.
  Para cargar los primeros de una vez hay un `.sql` aparte, fuera del repo.

## Entrada rápida con PIN
- Al entrar con email y contraseña, dejá tildado **"La próxima vez, entrar con un PIN"** y elegí un PIN de 4 a 6 números.
  Desde ahí, en ese dispositivo entrás sólo con el PIN. También se activa o se quita con el botón de arriba a la derecha.
- Con PIN activo, el botón **Bloquear** cierra el panel en esa pestaña sin cerrar la sesión: volvés con el PIN.
- El PIN no viaja a ningún lado: con él se cifra, en tu navegador, la sesión guardada. Si te equivocás 5 veces,
  o si te olvidás el PIN ("Entrar con email y contraseña"), se borra y entrás con la contraseña de siempre.
- Es por dispositivo y por dirección: en otra compu, en el celular o en una dirección de prueba de Vercel
  hay que entrar una vez con la contraseña y activarlo ahí.

## Excel de respaldo
En **Resumen**, el botón **Descargar Excel** baja un `.xlsx` con movimientos, proyectos, presupuestos, lista de
precios y un resumen mes a mes. Se abre en Excel o se sube a Google Drive (abre como Hoja de cálculo de Google).
El resumen mensual y los totales por proyecto tienen fórmulas: si agregás movimientos a mano en la planilla, se
recalculan solos. Bajarlo cada tanto sirve de copia por si algún día se pierde algo en Supabase.

## Más adelante: mostrar datos en la landing
Cada proyecto tiene un campo `is_featured` y `featured_result` (ej. "Redujo tiempos de facturación 40%") pensados para marcar qué casos de éxito mostrar públicamente, sin exponer montos ni datos sensibles. Cuando quieras activarlo, avisame y armamos esa parte.
