# BC Informática (landing + panel) — base de conocimiento
Última actualización: 14/9/2026

Si un dato no está acá, no existe. Este archivo se actualiza en el mismo commit en que cambia lo
que describe.

## 1. Qué es y para quién

Dos cosas en un mismo repo:

- **La landing** de BC Informática (https://bc-informatica.vercel.app): la cara pública del
  negocio. Servicios, precios, proyectos, contacto. La lee cualquier posible cliente.
- **El panel privado** (`/panel`): lo usa una sola persona, Belén. Hoy lleva plata (movimientos,
  balance), proyectos, lista de precios y presupuestos con PDF. Con el roadmap
  ([`docs/roadmap-panel.md`](docs/roadmap-panel.md)) pasa a ser también el board de trabajo:
  tareas, QA, bitácora y métricas de todos los proyectos.

## 2. Stack

| Pieza | Qué se usa | Por qué |
|---|---|---|
| Landing | Un solo `index.html` con HTML, CSS y JS adentro | Es chica: se edita y se ve sin compilar nada. Antes era React + Tailwind y sobraba. |
| Panel | HTML + CSS + JavaScript con módulos ES, sin framework | Mismo criterio: nada que aprender ni actualizar. Lo mantiene una sola persona. |
| Base y login | Supabase (Postgres 17 + Auth), cliente `supabase-js@2.116.0` desde jsDelivr | Login, base y seguridad por fila sin escribir un backend propio. Plan gratis. |
| Gráfico | Chart.js 4.4.4 desde jsDelivr | El gráfico de 6 meses del Resumen. |
| Excel de respaldo | ExcelJS 4.4.0 desde jsDelivr, se carga recién al tocar "Descargar Excel" | Arma un `.xlsx` con fórmulas reales. No pesa en la carga del panel. |
| PDF de presupuestos | El cuadro de impresión del navegador ("Guardar como PDF") | Texto real, liviano, con las mismas fuentes que la web. Sin librería de PDF. |
| Inflación | API pública de [ArgentinaDatos](https://argentinadatos.com) (INDEC) | Avisos de ajuste de precios. Si no responde, el panel anda igual. |
| Dólar MEP | [DolarAPI](https://dolarapi.com) | Pasa a pesos las referencias de mercado que están en dólares. |
| Empaquetado | Vite 6 | Solo para compilar la landing y copiar `public/` al build. El panel **no** pasa por Vite: se copia tal cual. |
| Hosting | Vercel | Push a `main` y publica solo. |
| Tipografías | Space Grotesk, JetBrains Mono, Inter (Google Fonts) | Sistema de diseño Dev Blueprint. |
| Tests | Playwright 1.63 (solo en desarrollo) + ExcelJS 4.4.0 para leer el Excel descargado | Los casos "Auto" de `docs/casos/`. No llegan al navegador ni al build. |

Paleta Dev Blueprint: grafito `#121412`, lima `#C6FF00`, verde circuito `#1B4332`,
crema `#FBF8E6`, gris `#8F9E8B`. Las variables CSS del panel están al principio de
`public/panel/index.html`.

### Cómo está armado el panel

Módulos ES sin compilar, todos en `public/panel/` y pedidos con ruta absoluta (`/panel/...`):

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura de las pestañas y todo el CSS (variables de Dev Blueprint arriba) |
| `config.js` · `referencias.js` | URL y anon key de Supabase · precios de mercado (scripts comunes, sin módulo) |
| `app.js` | Arranque: importa las vistas, conecta las pestañas y abre la sesión |
| `conexion.js` | Cliente de Supabase y el cifrado de la entrada con PIN |
| `sesion.js` | Login, PIN, Bloquear y Salir |
| `estado.js` | `state`, `loadAll()` (trae las cuatro tablas) y `borrar()` |
| `ui.js` · `formato.js` | Modal y aviso de abajo · formatos de plata, fechas y texto |
| `calculos.js` | Inflación, comparación con el mercado, tarifa por hora, precio por hora |
| `excel.js` | Excel de respaldo |
| `vistas/resumen.js` · `proyectos.js` · `movimientos.js` · `precios.js` · `presupuestos.js` | Una pestaña por archivo (Presupuestos está dentro de la pestaña Precios) |
| `presupuesto-doc.js` | Plantillas de texto y el documento con la marca que se guarda como PDF |

Cada vista le avisa a `estado.js` qué dibujar cuando llegan los datos (`alCambiarDatos(render)`), y
`app.js` las importa en el orden en que se dibujan. Una pestaña nueva es un archivo nuevo en
`vistas/` más su `import` en `app.js`.

## 3. Dónde vive

| Qué | Dónde |
|---|---|
| Repo | https://github.com/BelenCascone/bc-informatica (**público**) |
| Producción | https://bc-informatica.vercel.app — panel en https://bc-informatica.vercel.app/panel |
| Hosting | Vercel, cuenta personal (`aceituna`), proyecto `bc-informatica`: https://vercel.com/aceituna/bc-informatica |
| Base de datos | Supabase, proyecto `bc-informatica`, ref `dzerereqvsxrbonnotcy`, región `us-west-2` |
| Panel del proveedor | https://supabase.com/dashboard/project/dzerereqvsxrbonnotcy |
| Carpeta local | `C:\Users\belen\OneDrive\Escritorio\BC INFORMATICA` |
| Roadmap del board | [`docs/roadmap-panel.md`](docs/roadmap-panel.md). El original, con montos, en `Escritorio\Proyectos\roadmap-panel-bc.md` (fuera del repo) |

En la misma cuenta de Supabase está también el proyecto `agenda-turnos`: es otro sistema, no se
toca desde acá.

## 4. Accesos

Las contraseñas viven en Bitwarden, carpeta **"BC Informática"**. Acá solo se dice dónde está
cada una, nunca cuál es.

| Acceso | Dónde está guardado | Quién más lo tiene |
|---|---|---|
| Usuario del panel (email + contraseña) | Bitwarden → "BC panel" | solo yo |
| Cuenta de Supabase | Bitwarden → "Supabase cuenta" | solo yo |
| Contraseña de la base `bc-informatica` | Bitwarden → "Supabase bc-informatica — base" | solo yo |
| Cuenta de GitHub | Bitwarden → "GitHub" (con códigos de recuperación en notas) | solo yo |
| Cuenta de Vercel | Bitwarden → "Vercel" | solo yo |
| Gmail del negocio | Bitwarden → "Gmail BC" | solo yo |
| Usuario de prueba del panel (para los tests) | Bitwarden → "BC panel QA" y `.env.local` | solo yo |
| PIN del panel | No se guarda: es por dispositivo y se elige al activarlo | — |

- **Verificación en dos pasos** activada en Bitwarden, GitHub, Gmail, Vercel y Supabase, con una app
  de autenticación en el celular. Los códigos de recuperación de cada cuenta están en las notas de su
  ítem en Bitwarden.
- **La contraseña maestra de Bitwarden y su código de recuperación** están solo en papel, en casa.
  Si se pierden, Bitwarden no los puede recuperar.
- **Registro cerrado en Supabase:** "Allow new users to sign up" apagado (revisado el 14/9/2026).
- **GitHub:** escaneo de claves y Push protection activos en el repo.
- Bitwarden está en el **plan gratis**, que alcanza para todo esto.

Claves que usa el código:

- **URL y `anon key` de Supabase**: están en `public/panel/config.js`, versionadas **a propósito**.
  Son públicas por diseño; lo que protege los datos es la seguridad por fila (RLS) de la base.
- **`service_role` key de Supabase**: no se usa en ningún lado. Si algún día hace falta (por
  ejemplo, para una Edge Function), va como secreto de Supabase, nunca en el repo ni en el navegador.
- **Variables de entorno**: el sitio y el panel no usan ninguna. Los tests usan `PANEL_QA_EMAIL` y
  `PANEL_QA_PASSWORD` (el usuario de prueba) en `.env.local`. `.env.example` lista los nombres.
  `.env` y `.env.*` están en `.gitignore`.

Si alguna vez se sube una clave privada al repo, no alcanza con borrarla: hay que rotarla en el
proveedor. Al 14/9/2026 el historial de git está limpio.

## 5. Cómo se levanta y cómo se publica

```bash
npm install        # una vez
npm run dev        # landing en http://localhost:5173, panel en /panel/index.html
npm run build      # compila a dist/
npm run preview    # sirve dist/ para probar el build (panel en /panel/)
```

Para Claude Code hay una configuración en `.claude/launch.json` que levanta Vite en el puerto 4173.

**Tests** (Playwright, con el usuario de prueba de `.env.local`):

```bash
npx playwright install chromium   # una vez
npm test                          # todos los casos "Auto", contra Vite en el 4173 (~7 minutos)
npm run test:build                # algunos casos contra el build de producción (EST-04)
```

- Los tests usan el Supabase de producción con el **usuario de prueba**: como todo filtra por
  `owner_id`, ve una base vacía y no toca los datos reales.
- Todo lo que cargan lleva el prefijo `QA · ` y solo borran filas con ese prefijo. Si la cuenta de
  `.env.local` tiene alguna fila sin el prefijo (o sea, no es el usuario de prueba), no arrancan.
- La inflación y el dólar se prueban con respuestas fijas; los tests no dependen del mes.
- Supabase limita los logins por IP: la corrida entra 5 veces. No conviene correrla más de 5 o 6
  veces seguidas en pocos minutos.
- El reporte de la última corrida queda en `playwright-report/` (`npx playwright show-report`).

**Publicar:** push (o merge de PR) a `main` → Vercel compila y publica solo. Cada rama con PR
tiene su dirección de prueba de Vercel.

**Base de datos:** los cambios se hacen con un `.sql` en `supabase/` que se corre en
Supabase → SQL Editor → New query → pegar → Run. La guía completa desde cero está en
[`supabase/SETUP.md`](supabase/SETUP.md).

**Qué se rompe seguido:**

- **Rutas del panel.** El panel pide sus archivos con ruta absoluta (`/panel/app.js`,
  `/panel/config.js`), y los módulos se importan igual (`import … from "/panel/estado.js"`). Con
  rutas relativas se rompe según haya o no barra al final de `/panel`.
- **`/panel` en local.** Con `npm run dev`, `/panel` y `/panel/` muestran la landing; con
  `npm run preview`, `/panel` sin barra también. Lo resuelve una regla de `vercel.json` que solo
  corre en Vercel. En local se entra por `/panel/index.html`.
- **Archivos del panel fuera de `public/`.** Vite solo copia `public/` al build: si el panel
  estuviera en la raíz, Vercel no lo publicaría.
- **`vercel.json`.** La última regla manda todo a `index.html` (el router de la landing). Cualquier
  ruta nueva que tenga que servir otra cosa va antes de esa regla.
- **PIN en otra dirección.** El PIN es por dispositivo y por dirección: en una dirección de prueba de
  Vercel o en `localhost` hay que entrar con la contraseña y activarlo ahí.
- **Ventanas emergentes bloqueadas.** El PDF del presupuesto se abre en una pestaña nueva; si el
  navegador la bloquea, el panel avisa.
- **Un `.sql` sin correr.** El panel no se rompe: muestra un recuadro que dice qué archivo falta
  correr (pasa con `precios.sql` y `presupuestos-pdf.sql`).

## 6. Modelo de datos

Cuatro tablas en `public`, todas con `owner_id uuid default auth.uid()` y la misma política:
cada fila solo la ve y la toca quien la creó (`owner_id = auth.uid()`, para todo). El navegador
nunca manda `owner_id`: lo pone la base.

Se crearon corriendo a mano, en este orden:

1. [`supabase/schema.sql`](supabase/schema.sql) → `projects`, `transactions`
2. [`supabase/precios.sql`](supabase/precios.sql) → `price_items`, `quotes`
3. [`supabase/presupuestos-pdf.sql`](supabase/presupuestos-pdf.sql) → columna `quotes.doc`

Supabase **no** tiene registro de qué se corrió (no hay historial de migraciones): el orden de
arriba es la única fuente. Al 14/9/2026 los tres están aplicados en producción.

### `projects` — trabajos y clientes

`name`, `client_name`, `status` (`activo` · `pausado` · `finalizado`), `start_date`, `end_date`,
`description`.

- `is_featured` y `featured_result` están pensados para mostrar casos de éxito en la landing sin
  montos ni datos del cliente. Todavía no se usan.

### `transactions` — ingresos y egresos

`type` (`ingreso` · `egreso`), `amount`, `date`, `category` (texto libre), `description`,
`project_id` (opcional).

- `amount` es siempre positivo (`> 0`): el signo lo da `type`.
- Si se borra un proyecto, sus movimientos quedan con `project_id` vacío (`on delete set null`).

### `price_items` — lista de precios vigente

`category` (`service` · `sistemas` · `clases` · `asesoria` · `abonos` · `otros`), `name`, `price`,
`unit` (texto; el panel ofrece trabajo, hora, mes, clase, paquete, proyecto), `notes`.

- `updated_on` es la fecha del **último ajuste**, no de la última edición. De ahí sale el aviso:
  se pide revisar el precio si pasaron `adjust_every_months` meses (1 a 24, por defecto 3) **o** si la
  inflación publicada desde ese mes suma 5 % o más. El precio sugerido se redondea a $500.
- `ref_key` apunta a una referencia de mercado de `public/panel/referencias.js`, para compararlo.
- La **tarifa por hora** del panel es el primer precio con `unit = 'hora'` y `category = 'sistemas'`.

### `quotes` — presupuestos

`title`, `client_name`, `category` (mismas que `price_items`), `date`, `status`
(`borrador` · `enviado` · `aceptado` · `rechazado`), `list_price`, `final_price`, `parts_cost`,
`parts_paid_by` (`cliente` · `yo`), `hours_estimated`, `hours_real`, `includes`, `reasoning`,
`publishable`, `project_id` (opcional), `doc`.

- `list_price` es el precio antes de descuentos y `final_price` lo que se cobró. Si un presupuesto
  aceptado quedó más de 15 % debajo de la lista, aparece un aviso.
- Con `hours_real` se calcula cuánto quedó la hora y se compara con la tarifa por hora.
- `doc` (jsonb) guarda el contenido del PDF que se le mandó al cliente, para regenerarlo igual:
  número, situación, renglones, descuento, qué no incluye, plazos, condiciones, cierre.
- El número de presupuesto es correlativo por año (`2026-001`, `2026-002`…) y vive en `doc.numero`.
- `publishable` marca si se puede contar como caso en la landing, sin datos del cliente.

### Lo que no está en la base

- **Precios de mercado**: `public/panel/referencias.js`, datos públicos que se actualizan a mano.
- **Plantillas de texto de los presupuestos**: `public/panel/presupuesto-doc.js`.
- **Datos reales** (precios, presupuestos, clientes): solo en Supabase. Para cargarlos de una vez
  hay un `.sql` aparte, **fuera del repo**.

### Planeado, todavía no creado

El roadmap (sección 6) agrega columnas a `projects` (`pulso`, `proximo_paso`, `bloqueante`, `tipo`,
`repo_url`, `prod_url`, `ultimo_movimiento`) y siete tablas nuevas: `sprints`, `tasks`,
`task_events`, `qa_cases`, `qa_runs`, `bugs`, `journal`. Se crean en el sprint 02. Hasta entonces
no existen.

## 7. Decisiones tomadas

| Fecha | Decisión | Por qué |
|---|---|---|
| 10/9/2026 | La landing deja React + Tailwind y pasa a un solo `index.html` estático | Sitio chico: se edita sin compilar, carga rápido y no hay dependencias que mantener. |
| 11/9/2026 | Panel privado con Supabase (Auth + RLS), sin backend propio | Login y datos seguros sin servidor que mantener. |
| 11/9/2026 | Un solo usuario, creado a mano; registro cerrado | El panel es de una persona. Nadie más se puede registrar. |
| 11/9/2026 | La `anon key` va versionada en `config.js` | Es pública por diseño. La seguridad la da RLS, no el secreto de la clave. |
| 12/9/2026 | El panel vive en `public/panel/` | Vite copia `public/` tal cual al build; desde la raíz Vercel no lo publicaba. |
| 12/9/2026 | El panel pide sus archivos con ruta absoluta | Con rutas relativas fallaba según la barra final de la URL. |
| 12/9/2026 | Los datos reales no entran al repo | El repo es público. Precios y presupuestos viven solo en Supabase. |
| 12/9/2026 | Precios de mercado a mano; inflación y dólar de APIs públicas | Las referencias cambian poco y hay que elegirlas con criterio. Si una API falla, el panel sigue. |
| 14/9/2026 | PDF de presupuestos desde el cuadro de impresión del navegador | Texto real, liviano, mismas fuentes que la web, cero librerías. |
| 14/9/2026 | Entrada rápida con PIN que cifra la sesión en el navegador (PBKDF2 + AES-GCM) | Entrar rápido sin dejar la sesión abierta en claro. El PIN no viaja; a los 5 errores se borra. |
| 14/9/2026 | Respaldo en Excel desde el Resumen | Copia propia de los datos, que se abre en Excel o Google Drive. |
| 14/9/2026 | El board de proyectos se construye como pestañas nuevas de este panel | Una URL, un login, una base. Plata y precios ya estaban hechos (ver roadmap). |
| 14/9/2026 | Contraseñas en Bitwarden; esta base dice dónde, nunca cuál | Repo público: un archivo con contraseñas es un incendio esperando. |
| 14/9/2026 | `app.js` partido en módulos: una pestaña por archivo en `vistas/`, lo común aparte | Con 70 KB en un archivo no se podían sumar las seis pestañas del board. Sin cambiar nada de lo que hace. |
| 14/9/2026 | Tests de Playwright contra el Supabase de producción, con un usuario de prueba | Sin base aparte que mantener. RLS aísla al usuario de prueba; el prefijo `QA · ` y la traba del arranque evitan borrar datos reales. |
| 14/9/2026 | El panel pasa a barra lateral (Trabajo / Plata), con una dirección por vista e Inicio como pantalla de entrada (sprint 03) | Con diez vistas las pestañas no entran y el panel se parecía a la landing. Inicio absorbe "Hoy". Detalle en el roadmap, secciones 4, 5 y 7. |
| 14/9/2026 | `supabase-js` fijado en 2.116.0 | Con `@2` podía cambiar solo cualquier día. Es la versión que `@2` bajaba ese día: no cambia nada. |

## 8. Pendientes conocidos

- **Los `.sql` están sueltos, sin número de orden y sin registro en Supabase.** Se ordenan en el
  sprint 02, antes de sumar tablas nuevas.
- **Errores confirmados en la corrida de base del sprint 01** (detalle en
  [`docs/casos/sprint-01.md`](docs/casos/sprint-01.md)). Hay que decidir cuándo se arreglan; los
  tests están marcados "así anda hoy" y avisan cuando cambie:
  - E-01: no se puede crear un proyecto sin fecha de inicio (`invalid input syntax for type date`).
  - E-02: nombres, clientes y descripciones de proyectos y movimientos no se escapan: `Monitor 24"`
    se corta al editar.
  - E-03: tocar el fondo oscuro cierra cualquier modal sin preguntar y se pierde lo cargado.
  - E-04: con un PIN nuevo de menos de 4 números sale el aviso del navegador, no el del panel.
- **Contraseña del usuario de prueba:** cambiarla por una larga generada en Bitwarden y actualizar
  `.env.local`.
- **Precio de las clases:** la lista de precios (en Supabase) y la landing no dicen lo mismo.
  Unificar antes de mandar más propuestas.
- **Supabase avisa que la protección de contraseñas filtradas está apagada** (Auth → contraseñas).
  Es posible que no esté disponible en el plan gratis; mientras tanto, contraseña larga generada por
  Bitwarden.
- **Casos manuales del sprint 01 sin correr:** PRS-16, PRS-17, XLS-03, EST-05 y EST-07 en el
  celular (se corren en la dirección de prueba del PR).
- **`is_featured`, `featured_result` y `publishable` no se usan todavía** en la landing.
