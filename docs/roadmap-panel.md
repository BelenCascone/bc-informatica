# Panel BC — roadmap del board propio

> Copia del roadmap para el repo, sin montos ni nombres de clientes (el repo es público). **Esta es la
> versión que se mantiene:** los cambios de alcance, campos o tablas se hacen acá. El original con
> montos queda en `Escritorio\Proyectos\roadmap-panel-bc.md` como archivo.

Board de trabajo personal de BC Informática: una sola usuaria (Belén), todos los proyectos
abiertos en un lugar, con mirada de desarrolladora **y** de QA manual. No es un ClickUp
genérico: es el panel que le falta a ella.

**Estado:** sprint 01 (ordenar la casa) terminado el 14/9/2026: `app.js` partido en módulos y 72
tests de Playwright. Falta publicarlo y usarlo un día real. Próximo: sprint 02 (datos).
**Se construye con:** Claude Code, un sprint por sesión.

-----

## 0. Regla de arranque — la base de conocimiento

**Todo proyecto de BC Informática, sea cual sea, arranca con su base de conocimiento.**
Antes de la primera línea de código. Es el archivo que contesta "¿cómo estaba armado esto?"
seis meses después, cuando volvés a un proyecto que no tocás hace rato o cuando tenés que
pasárselo a alguien.

Va en la raíz del repo, se llama `BASE-CONOCIMIENTO.md` y se actualiza en el mismo commit
en que cambia lo que describe. Si un dato no está ahí, no existe.

### Qué lleva

```markdown
# <Proyecto> — base de conocimiento
Última actualización: <fecha>

## 1. Qué es y para quién
Una frase. Cliente, problema que resuelve, quién lo usa.

## 2. Stack
Lenguaje, framework, versiones, librerías que importan y por qué se eligió cada cosa.

## 3. Dónde vive
| Qué | Dónde |
|---|---|
| Repo | github.com/... (público / privado) |
| Producción | https://... |
| Hosting | Vercel / Cloudflare / la PC del cliente |
| Base de datos | Supabase, proyecto `xxxx`, región |
| Panel del proveedor | link directo al dashboard |
| Carpeta local | C:\... |

## 4. Accesos
Qué credenciales hacen falta y **dónde están guardadas** — nunca el valor acá.
| Acceso | Dónde está guardado | Quién más lo tiene |
|---|---|---|
| Usuario del panel | Bitwarden → "BC panel" | solo yo |
| Contraseña de la base | Bitwarden → "Supabase bc-informatica" | solo yo |
| Claves de la API | archivo `.env.local` (no versionado) + Bitwarden | solo yo |

## 5. Cómo se levanta y cómo se publica
Comandos exactos: instalar, correr local, compilar, desplegar. Qué se rompe seguido.

## 6. Modelo de datos
Tablas, qué guarda cada una, las reglas que no se ven en el esquema.

## 7. Decisiones tomadas
Fecha + decisión + por qué. Lo que un "por qué está hecho así" tendría que contestar.

## 8. Pendientes conocidos
Lo que sabés que falta o está con cinta adhesiva.
```

### Las contraseñas no van en el archivo

El repo de la landing **es público**: cualquiera lo lee. Y aunque fuera privado, un archivo de
texto con contraseñas es un incendio esperando. La regla:

1. **Las contraseñas viven en un gestor** — Bitwarden es gratis y anda con la extensión del
   navegador. Una carpeta "BC Informática" con todo adentro.
2. **La base de conocimiento dice dónde está cada una, nunca cuál es.**
3. **Las claves que el código necesita** van en `.env.local`, que está en `.gitignore`, con un
   `.env.example` versionado que lista los nombres sin los valores.
4. **Excepción:** las claves públicas por diseño (la `anon key` de Supabase) sí pueden estar en
   el código. Ya está bien resuelto en `public/panel/config.js`.
5. Si alguna vez subiste una clave a un repo, no alcanza con borrarla del archivo: hay que
   rotarla en el proveedor.

Esta misma regla vale para AUMÉ, Agenda de turnos, el bot de WhatsApp y Proyecto Pilcha.
Cada uno con su `BASE-CONOCIMIENTO.md`, todos apuntando a la misma bóveda.

-----

## 1. El problema que resuelve el board

Los proyectos viven repartidos: carpetas en `Escritorio\Proyectos`, repos en GitHub, docs del
proyecto de Claude, el panel de precios, y la cabeza. Cuando arranca el día no hay un solo
lugar que conteste tres preguntas:

1. ¿En qué estoy parada en cada proyecto?
2. ¿Qué hay listo para testear?
3. ¿Qué agarro hoy?

El board contesta esas tres antes que cualquier otra cosa. Todo lo demás es secundario.

## 2. Lo que ya existe (y se aprovecha entero)

El panel de https://bc-informatica.vercel.app/panel ya resuelve media cancha:

| Ya está hecho | Detalle |
|---|---|
| Login privado | Supabase Auth, usuario creado a mano, registro cerrado |
| Seguridad | RLS por `owner_id` en todas las tablas |
| Pestaña Resumen | KPIs de balance, gráfico de 6 meses, avisos |
| Pestaña Proyectos | Tabla `projects` con estado, cliente, fechas |
| Pestaña Movimientos | Ingresos y egresos por proyecto |
| Pestaña Precios | Lista viva, presupuestos, inflación del INDEC, dólar MEP, comparación de mercado |
| Diseño | Dev Blueprint aplicado |
| Deploy | Push a `main` y Vercel publica |

**Decisión: el board no se hace de cero. Se le agregan pestañas al panel que ya tenés.**
Una sola URL, un solo login, una sola base. Lo de plata y clientes ya está terminado — se
saca del alcance y se gana un sprint entero.

## 3. Inventario real de proyectos (el seed)

| Proyecto | Qué es | Estado hoy |
|---|---|---|
| AUMÉ | Sistema de viandas + web + panel admin. Cliente real | En producción, con cambios pendientes |
| Agenda de turnos | Next.js + Supabase + Playwright, para un consultorio | En desarrollo |
| Bot WhatsApp | Node, integración de mensajería | En desarrollo |
| Landing + panel BC | Vanilla + Vite + Supabase en Vercel | Publicado, se extiende con este roadmap |
| Proyecto Pilcha | App de escritorio Tauri para locales de ropa, 5 niveles | Roadmap listo, sin empezar |
| Contenido Instagram | Calendario de 12 semanas, 2 posteos por semana | En marcha, recurrente |

Si un proyecto no está en esta tabla, no existe para el board.

## 4. Decisiones tomadas

- **Se extiende `public/panel/`**, no se empieza un proyecto nuevo.
- **Mismo stack que ya tiene el panel:** HTML + CSS + JavaScript sin framework, Supabase,
  Vite para empaquetar, Vercel para publicar. Nada nuevo que aprender.
- **Una excepción técnica:** `app.js` ya tiene 70 KB (1.457 líneas) en un solo archivo. Antes de
  sumarle seis vistas más hay que partirlo en módulos ES (`resumen.js`, `proyectos.js`,
  `tablero.js`, …). Eso es el sprint 01 y no se saltea.
- **La tabla `projects` se amplía, no se duplica.** Las columnas nuevas (pulso, próximo paso,
  bloqueante, repo) se suman a la que ya existe y ya tiene tus datos.
- **Escritorio para trabajar, celular para mirar.** Tablero y QA se diseñan para pantalla
  grande; Hoy, Proyectos y Métricas tienen que leerse bien en el celular.
- **Las métricas se calculan, no se cargan.** Todo sale de una tabla de eventos.

## 5. Las pestañas nuevas

| Pestaña | Qué contesta | ¿Existe? |
|---|---|---|
| **Hoy** | Qué agarro ahora: 3 tareas sugeridas, lo que quedó a medias, lo trabado, lo que hay para testear | Nueva — pasa a ser la pantalla de entrada |
| **Proyectos** | Dónde estoy parada: pulso, próximo paso, bloqueante, sprint activo | Se amplía la que ya está |
| **Tablero** | Kanban del sprint en curso, arrastrar y soltar | Nueva |
| **QA** | Cola de listo-para-testear, casos, bugs, reverificación | Nueva |
| **Bitácora** | Entradas cortas: dónde quedé, qué aprendí, qué me frenó | Nueva |
| **Métricas** | Velocidad, cuánto tarda una tarea, bugs por entrega, en qué se te va el tiempo | Nueva |
| **Resumen · Movimientos · Precios** | Plata y clientes | Ya terminadas |

### La mirada humana (esto es lo que lo diferencia de ClickUp)

En la ficha de cada proyecto, tres campos que no son de gestión sino de cabeza:

- **Pulso:** `en llamas` · `andando` · `frenado` · `dormido` — cómo lo sentís, no cómo va el %.
- **Próximo paso:** una sola frase en tus palabras. "Falta que el pedido baje a la PC."
- **Qué me frena:** el bloqueante real, que muchas veces no es técnico ("no le contesté a la clienta").

Un proyecto sin movimiento hace más de 14 días se marca **dormido** y el board te pregunta si
lo cerrás, lo pausás o lo retomás. Nada de listas infinitas de cosas abiertas.

## 6. Modelo de datos

Sobre lo que ya existe (`projects`, `transactions`, `price_items`, `quotes`):

```sql
-- projects: columnas nuevas
alter table projects add column pulso text default 'andando'
  check (pulso in ('en_llamas','andando','frenado','dormido'));
alter table projects add column proximo_paso text;
alter table projects add column bloqueante text;
alter table projects add column tipo text default 'cliente'
  check (tipo in ('cliente','propio','contenido'));
alter table projects add column repo_url text;
alter table projects add column prod_url text;
alter table projects add column ultimo_movimiento timestamptz default now();
```

Tablas nuevas, todas con `owner_id uuid default auth.uid()` y la misma política de RLS que
ya usa el panel:

```
sprints       id, project_id, numero, nombre, objetivo, desde, hasta, estado

tasks         id, project_id, sprint_id?, titulo, detalle,
              tipo (feature|bug|chore|qa),
              estado (backlog|todo|doing|blocked|qa|done),
              prioridad, estimado_horas, orden,
              creada, empezada, pasada_a_qa, cerrada

task_events   id, task_id, estado_anterior, estado_nuevo, timestamp
              -- de acá salen TODAS las métricas

qa_cases      id, project_id, titulo, pasos, resultado_esperado, area, activo

qa_runs       id, qa_case_id, task_id?, fecha, resultado (pasa|falla|bloqueado), nota

bugs          id, project_id, task_origen?, titulo,
              severidad (baja|media|alta|critica), pasos_para_reproducir,
              estado (abierto|en_arreglo|a_reverificar|cerrado),
              encontrado_en, cerrado_en

journal       id, fecha, project_id?, texto
```

Reglas del modelo:

1. Una tarea que pasa a `qa` **crea sola** su entrada en la cola de QA. No se carga a mano.
2. `task_events` se escribe con un trigger de Postgres, no desde el navegador.
3. `projects.ultimo_movimiento` se actualiza solo con cualquier evento del proyecto.
4. Ninguna tabla nueva sale a producción sin su política de RLS. Sin excepción.

## 7. Sprints

Cada sprint termina **publicado y usado un día real** antes de arrancar el siguiente.

| # | Sprint | Qué queda funcionando |
|---|---|---|
| `00` | Base de conocimiento | `BASE-CONOCIMIENTO.md` del repo completo, `CLAUDE.md` escrito, bóveda de Bitwarden armada, `.env.example`. **Sin esto no se escribe código.** |
| `01` | Ordenar la casa | `app.js` partido en módulos ES, una vista por archivo, el panel andando exactamente igual que antes |
| `02` | Datos | Migración SQL con las columnas nuevas y las 6 tablas nuevas, RLS y triggers, seed con los 6 proyectos reales |
| `03` | Proyectos ampliado | Pulso, próximo paso y bloqueante en la ficha; la lista muestra el pulso de un vistazo. **Acá ya sirve para algo.** |
| `04` | Tablero | Kanban del sprint activo, arrastrar y soltar, alta y edición rápida de tareas |
| `05` | Hoy | Nueva pantalla de entrada: sugerencias, trabado, a medias, para testear |
| `06` | QA | Cola de testeo, casos, correr un caso, cargar bug, reverificar |
| `07` | Bitácora | Entrada rápida del día, historial por proyecto, buscador |
| `08` | Métricas | Velocidad, tiempo de tarea, bugs por entrega, tiempo por proyecto |
| `09` | Pulido | Atajos de teclado, buscador global, PWA para el celular, exportar respaldo en JSON |
| `10` | Automático | Traer commits e issues de GitHub, aviso de proyecto dormido, resumen semanal |

**Primer corte usable: sprint 03.** Si después de ese no lo abrís todos los días, hay algo mal
en el diseño y conviene parar antes de seguir construyendo.

Sprints 00–05: unas 3 semanas part-time. Hasta el 08: 5 a 7 semanas. El 09 y el 10 son para
cuando ya lo estés usando.

## 8. Cómo hacerlo con Claude Code

1. **Sprint 00 antes que nada.** La base de conocimiento y el `CLAUDE.md` no son burocracia:
   son lo que hace que Claude Code no invente estructura ni te pise lo que ya funciona.
2. **`CLAUDE.md` lleva:** el stack, la paleta Dev Blueprint, el modelo de datos de este
   roadmap, y la regla de que no se inventan campos ni tablas que no estén acá — si falta
   algo, primero se agrega al roadmap.
3. **Una sesión = un sprint = una rama.** `sprint-04-tablero`, y merge cuando está publicado.
4. **Arrancá cada sesión en plan mode.** Le pasás el sprint del roadmap, te devuelve el plan,
   vos lo corregís, recién ahí escribe código.
5. **Los casos de prueba los escribís vos antes.** Sos QA: cada sprint arranca con la lista de
   lo que tiene que funcionar, y Claude Code la convierte en tests de Playwright. Ya lo usás
   en Agenda de turnos.
6. **Migraciones SQL versionadas** en `supabase/`. Nunca cambios a mano en el panel de Supabase
   sin dejar el `.sql` en el repo.
7. **Nada de datos reales de clientes en el repo** — es público. Montos, contactos y credenciales
   se cargan en producción, a mano.

Prompt de arranque de cada sprint:

> Leé `docs/roadmap-panel.md` y `BASE-CONOCIMIENTO.md`. Vamos con el sprint NN. Antes de escribir
> nada, pasame el plan.

## 9. Reglas que no se negocian

1. Ningún proyecto arranca sin su `BASE-CONOCIMIENTO.md`.
2. Las contraseñas nunca se escriben en un archivo del repo.
3. Si una vista no te cambia lo que hacés hoy, no va. El board se mide por si lo abrís, no por
   cuántas funciones tiene.
4. Cargar una tarea tiene que costar menos de 10 segundos. Si cuesta más, dejás de cargarlas y
   el board se muere.
5. Toda tarea que pasa a `qa` aparece sola en la cola de QA.
6. Las métricas salen de eventos. Ningún número se escribe a mano.
7. Respaldo exportable en JSON desde el sprint 02.

## 10. Pendientes por definir

- **Precio de las clases:** la lista de precios y la landing no dicen lo mismo. Unificar antes de
  seguir mandando propuestas.
- Si querés que el board traiga commits e issues de GitHub solo (sprint 10).
- Si querés aviso por WhatsApp o mail del resumen semanal, o te alcanza con abrirlo.
- Si el `BASE-CONOCIMIENTO.md` de los otros cinco proyectos se escribe de una o a medida que
  vas tocando cada uno.
- **Seed del sprint 02:** los 6 proyectos reales se cargan con un `.sql` fuera del repo (tienen
  datos de clientes); en el repo va, como mucho, un seed de ejemplo.
