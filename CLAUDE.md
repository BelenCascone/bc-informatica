# CLAUDE.md — BC Informática (landing + panel)

## Antes de tocar nada

1. Leé [`BASE-CONOCIMIENTO.md`](BASE-CONOCIMIENTO.md): qué hay, dónde vive, cómo está armado y por qué.
2. Si la tarea es del board, leé el sprint que toca en [`docs/roadmap-panel.md`](docs/roadmap-panel.md).
3. Pasá el plan antes de escribir código. Belén lo corrige; recién ahí se implementa.

## Stack (no se cambia sin decidirlo antes)

- **Landing:** todo en `index.html` (HTML, CSS y JS). No se parte en archivos ni se le suma framework.
- **Panel:** `public/panel/`. HTML + CSS + JavaScript con módulos ES, **sin framework y sin paso de
  compilación**: Vite lo copia tal cual al build, no lo procesa. Por eso:
  - nada de `import` de paquetes npm en el navegador; las librerías vienen de jsDelivr con
    **versión exacta** (`chart.js@4.4.4`, no `chart.js@4`);
  - los archivos del panel se piden y se importan con **ruta absoluta** (`/panel/app.js`,
    `import … from "/panel/estado.js"`), nunca relativa;
  - todo archivo del panel va dentro de `public/panel/`, si no Vercel no lo publica;
  - una pestaña = un archivo en `public/panel/vistas/`, que se registra con `alCambiarDatos()` y se
    importa en `app.js`. Lo compartido va en los módulos de `public/panel/` (ver
    `BASE-CONOCIMIENTO.md`, sección 2).
- **Datos:** Supabase con `supabase-js`. Sin backend propio.
- **Publicación:** merge a `main` → Vercel publica. No hay otro entorno.

## Diseño: Dev Blueprint

Usá las variables que ya define `public/panel/index.html` y no inventes colores nuevos:

| Variable | Valor | Uso |
|---|---|---|
| `--ground` | `#121412` | fondo (grafito) |
| `--surface` / `--surface-2` | `#1A1D1A` / `#232823` | paneles, modales |
| `--lime` | `#C6FF00` | acento, acción principal, "bien" |
| `--circuit` | `#1B4332` | verde circuito |
| `--cream` | `#FBF8E6` | texto |
| `--muted` | `#8F9E8B` | texto secundario |
| `--red` | `#ff6b5e` | error, egreso, "mal" |

Tipografías: Space Grotesk (títulos, `--f-display`), JetBrains Mono (etiquetas, botones, números,
`--f-mono`), Inter (texto, `--f-body`). Reusá las clases que ya existen (`.panel`, `.panel-head`,
`.kpi`, `.badge`, `.pill`, `.btn`, `.btn--primary`, `.btn--ghost`, `.icon-btn`, `.modal`,
`.field`, `.avisos`) antes de crear otras. Los títulos de panel van con `// ` adelante.

Tablero y QA se diseñan para escritorio; Hoy, Proyectos y Métricas tienen que leerse bien en el celular.

## Modelo de datos

- **No se inventan campos ni tablas.** El modelo es el de `BASE-CONOCIMIENTO.md` (sección 6) más lo
  planeado en el roadmap (sección 6). Si hace falta algo que no está, primero se agrega al roadmap y
  se lo consultás a Belén.
- Toda tabla nueva lleva `owner_id uuid not null default auth.uid()`, RLS activado y la política
  `owner_id = auth.uid()` para todo, en el mismo `.sql` que la crea. Sin excepción.
- Todo cambio a la base queda como `.sql` en `supabase/`. Nunca un cambio a mano en el panel de
  Supabase sin su archivo en el repo. Los `.sql` se escriben para poder correrse dos veces sin
  romper (`if not exists`).
- `task_events` y `projects.ultimo_movimiento` se escriben con triggers de Postgres, no desde el
  navegador. Las métricas se calculan desde eventos: ningún número se carga a mano.
- Si una tabla o columna nueva todavía no existe en producción, el panel avisa qué `.sql` falta
  correr en vez de romperse (así lo hacen hoy Precios y Presupuestos).

## El repo es público

- Nada de datos reales de clientes: montos, nombres, teléfonos, direcciones.
- Nada de contraseñas, tokens ni la `service_role` key. La `anon key` de `config.js` sí va: es
  pública por diseño.
- Los datos reales se cargan en producción, a mano o con un `.sql` que queda fuera del repo.

## Forma de trabajo

- **Una sesión = un sprint = una rama:** `sprint-NN-nombre` (ej. `sprint-04-tablero`). Merge
  cuando está publicado.
- Cada sprint arranca con los casos de prueba que escribe Belén en `docs/casos/sprint-NN.md`; los
  marcados "Auto" se convierten en tests de Playwright. Los tests corren con el **usuario de
  prueba** (credenciales en `.env.local`), nunca con el usuario real de Belén.
- **`BASE-CONOCIMIENTO.md` se actualiza en el mismo commit** en que cambia lo que describe (tablas,
  archivos, accesos, decisiones, pendientes).
- Verificá los cambios del panel en el navegador con la configuración `bc-informatica` de
  `.claude/launch.json` (Vite en el puerto 4173; el panel está en `/panel/index.html`) y con
  `npm test` antes de darlos por hechos.
- Cargar una tarea en el board tiene que costar menos de 10 segundos. Si una vista no cambia lo que
  Belén hace hoy, no va.

## Idioma y tono

Interfaz, comentarios, mensajes de commit y documentación en **español rioplatense** (vos, tenés,
cargá). Frases cortas y concretas, sin jerga cuando hay una palabra común.
