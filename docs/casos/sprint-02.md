# Sprint 02 — casos de prueba

Última actualización: 14/9/2026 · Lista aprobada por Belén el 14/9/2026. Resultados de las corridas
al final.

El sprint 02 prepara la base para el board: ordena los `.sql` que ya existen, suma las columnas
nuevas de `projects` y las 7 tablas nuevas (con RLS y triggers) y agrega el respaldo en JSON. En la
pantalla solo cambia una cosa: el botón del respaldo en Resumen. El modelo está en
[`docs/roadmap-panel.md`](../roadmap-panel.md), sección 6.

## Cómo se usa esta lista

- **Auto:** test de Playwright. Casi todos los de este sprint hablan directo con la base (la misma
  API que usa el panel), con el **usuario de prueba**: no hay pantallas nuevas para tocar.
- **Manual:** los corre Belén a mano.
- **Al aplicar:** los corre Claude al aplicar cada `.sql` en producción y anota el resultado acá.
- Todo lo que cargan los tests lleva el prefijo `QA · ` y se borra al terminar, como en el sprint 01.
  La limpieza y el control de "la cuenta tiene filas que no son de prueba" pasan a mirar también las
  tablas nuevas.
- Los tests nuevos van en `tests/panel/i-datos.spec.js` (secciones A a E) y en
  `tests/panel/b-resumen.spec.js` (sección F, el botón está en Resumen).

---

## A. Los `.sql` ordenados

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| MIG-01 | Archivos numerados | Mirar `supabase/` | `001-proyectos-y-movimientos.sql`, `002-precios.sql`, `003-presupuestos-pdf.sql`, `004-board.sql`. `SETUP.md` y la base de conocimiento los nombran en ese orden. No queda ningún `.sql` sin número | Auto |
| MIG-02 | Se pueden correr dos veces | Correr cada archivo dos veces seguidas | La segunda vez no da error y no cambia nada (mismas tablas, columnas, políticas y filas) | Al aplicar |
| MIG-03 | Historial en Supabase | Supabase → Database → Migrations | Aparecen los cuatro, en orden | Manual |
| MIG-04 | El panel no cambió | Correr toda la suite del sprint 01 | Pasan los mismos 71 + 6 del build | Auto |
| MIG-05 | Avisos con el nombre nuevo | Simular que falta la tabla de precios y que falta la columna `doc` | El recuadro de Precios dice `supabase/002-precios.sql`; el de presupuestos dice `supabase/003-presupuestos-pdf.sql`. Ningún archivo del panel (tampoco el aviso al guardar un presupuesto) nombra los `.sql` viejos | Auto |

## B. Estructura de las tablas

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| DAT-01 | Proyecto nuevo con valores por defecto | Crear un proyecto desde el panel, como hoy | Queda con pulso `andando`, tipo `cliente` y `ultimo_movimiento` con la hora de ahora. Próximo paso, bloqueante, repo y producción, vacíos | Auto |
| DAT-02 | Los proyectos que ya existen | Mirar el proyecto que ya estaba cargado, después de aplicar `004` | Mismos datos que antes, más pulso `andando` y tipo `cliente` | Al aplicar |
| DAT-03 | Valores que no existen | Cargar pulso `tranqui`, tipo de proyecto `otro`, estado de sprint `abierto`, tipo de tarea `mejora`, estado de tarea `hecha`, prioridad `urgente`, severidad `grave`, estado de bug `resuelto`, resultado de QA `ok` | La base rechaza cada uno. Los siete estados de tarea que sí existen (`backlog`, `todo`, `doing`, `blocked`, `qa`, `ready`, `done`) se aceptan | Auto |
| DAT-04 | Tarea nueva con valores por defecto | Crear una tarea con solo proyecto y título | Estado `backlog`, prioridad `media`, `creada` con la hora de ahora; `empezada`, `pasada_a_qa` y `cerrada` vacías | Auto |
| DAT-05 | Tarea sin proyecto o sin título | Crear una tarea sin proyecto, y otra sin título | La base rechaza las dos | Auto |
| DAT-06 | Un solo sprint activo | En un proyecto: un sprint `activo` y después otro `activo` · otro `planeado` · el mismo `activo` en otro proyecto | El segundo activo se rechaza · el planeado se guarda · el de otro proyecto se guarda | Auto |
| DAT-07 | Número de sprint único | Dos sprints con el número 1 en el mismo proyecto · el número 1 en otro proyecto | El segundo se rechaza · en otro proyecto se guarda | Auto |
| DAT-08 | Bitácora con la fecha de hoy | Escribir una entrada sin fecha | Queda con la fecha de hoy en Argentina. El test compara con la fecha de Argentina; el error de UTC solo se vería después de las 21 h, así que además se revisa la definición al aplicar | Auto + Al aplicar |
| DAT-09 | Bitácora sin proyecto | Escribir una entrada sin proyecto | Se guarda | Auto |

## C. Lo que la base hace sola

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| TRG-01 | Alta de una tarea | Crear una tarea | Queda un evento: de (nada) a `backlog`, con fecha y hora | Auto |
| TRG-02 | Cambios de estado | Pasar la tarea por `todo` → `doing` → `qa` → `ready` → `done` | Un evento por cada cambio, con el estado de antes y el nuevo, en orden. `empezada` se completa al pasar a `doing`, `pasada_a_qa` al pasar a `qa` y `cerrada` al pasar a `done` (en `ready` todavía está vacía) | Auto |
| TRG-03 | Editar sin cambiar de estado | Cambiar el título o la prioridad | No se crea ningún evento | Auto |
| TRG-04 | Volver atrás | Tarea en `done` → `doing` → `qa` → `done` otra vez | `empezada` queda con la **primera** vez que se empezó. `pasada_a_qa` y `cerrada` quedan con la **última** vez. Mientras está reabierta, `cerrada` queda vacía | Auto |
| TRG-05 | Tareas trabadas | Pasar una tarea a `blocked` y después a `doing` | Dos eventos; no cambia `empezada` si ya estaba | Auto |
| TRG-06 | Último movimiento del proyecto | Con `ultimo_movimiento` viejo, hacer de a uno: crear una tarea · cambiarle el estado · crear un sprint · cargar un bug · correr un caso de QA · escribir en la bitácora con ese proyecto · cambiar el pulso · el próximo paso · el bloqueante | Cada vez, `ultimo_movimiento` pasa a la hora de ahora | Auto |
| TRG-07 | Lo que no es movimiento de trabajo | Con `ultimo_movimiento` viejo: cargar un ingreso en el proyecto · cambiarle el nombre o el cliente · escribir en la bitácora sin proyecto | `ultimo_movimiento` no cambia: la plata no cuenta como movimiento de trabajo | Auto |
| TRG-08 | Tareas en QA | Pasar dos tareas a `qa` y una a `done` | Pedir las tareas en estado `qa` devuelve las dos, la que llegó primero arriba (por `pasada_a_qa`). Esa es la cola de QA; no hay que cargar nada más | Auto |
| TRG-09 | Bug en QA: la tarea vuelve | Tarea en `qa` → cargar un bug con esa tarea de origen | El bug queda `abierto`. La tarea pasa sola a `doing` y queda el evento de `qa` a `doing` | Auto |
| TRG-10 | Bug de una tarea que no está en QA | Cargar un bug con tarea de origen en `doing`, otro en `ready` y otro en `done` | Las tres tareas quedan en su estado; no se crea ningún evento | Auto |
| TRG-11 | El ciclo completo | Tarea en `qa` → bug (vuelve a `doing`) → cerrar el bug → tarea a `qa` → `ready` → `done` | Eventos en orden: `qa`→`doing`, `doing`→`qa`, `qa`→`ready`, `ready`→`done`. `pasada_a_qa` queda con la segunda vez | Auto |
| TRG-12 | Cierre de un bug | Cargar un bug · pasarlo a `cerrado` · cambiarle el título · pasarlo a `a_reverificar` · cargar otro ya `cerrado` | `encontrado_en` con la hora de carga y `cerrado_en` vacío · `cerrado_en` con la hora de cierre · no cambia · se vacía · tiene `cerrado_en` | Auto |
| TRG-13 | Las fechas del ciclo no se cargan a mano | Mandar desde la API `ultimo_movimiento` de un proyecto y `creada`, `empezada`, `pasada_a_qa`, `cerrada` de una tarea, al crear y al editar; y `cerrado_en` de un bug abierto | La base las ignora y pone las suyas | Auto |

## D. Seguridad

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| SEG-01 | RLS en las tablas nuevas | Supabase → Advisors después de aplicar `004` | Ninguna alerta de seguridad nueva; las 7 tablas con RLS activado | Al aplicar |
| SEG-02 | Solo lo tuyo | Con el usuario de prueba, pedir todas las filas de las 7 tablas | Solo aparecen las del usuario de prueba (ninguna de Belén) | Auto |
| SEG-03 | Sin sesión no se ve nada | Pedir las 7 tablas solo con la `anon key`, sin entrar | Vienen vacías o rechazadas; nunca con filas | Auto |
| SEG-04 | No se puede cargar a nombre de otro | Crear una fila en cada tabla nueva con un `owner_id` inventado | La base rechaza cada una | Auto |
| SEG-05 | Los eventos no se tocan a mano | Desde la API: crear un evento de tarea, editar uno y borrar uno | Los tres se rechazan. Leer los eventos propios sí se puede | Auto |

## E. Borrar

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| BOR-01 | Borrar un proyecto | Proyecto con sprint, tarea (con eventos), caso de QA con una corrida, bug, entrada de bitácora y un movimiento → borrarlo | Se borran el sprint, la tarea, sus eventos, el caso, su corrida y el bug. La entrada de bitácora y el movimiento quedan, sin proyecto | Auto |
| BOR-02 | Borrar un sprint | Sprint con dos tareas → borrarlo | Las tareas quedan, sin sprint, con el mismo estado | Auto |
| BOR-03 | Borrar una tarea | Tarea con un bug que salió de ella y una corrida de QA → borrarla | Se borran sus eventos. El bug y la corrida quedan, sin tarea de origen | Auto |
| BOR-04 | Borrar un caso de QA | Caso con dos corridas → borrarlo | Se borran sus corridas | Auto |

## F. Respaldo en JSON

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| JSN-01 | Descargar | En Resumen, "Descargar respaldo (JSON)" | El botón dice "Armando el respaldo…" y se desactiva; baja `BC-Informatica-respaldo-AAAA-MM-DD.json`; aviso "Respaldo descargado." | Auto |
| JSN-02 | Qué trae | Con un proyecto, un movimiento, un precio, un presupuesto, un sprint, una tarea (con eventos), un caso con su corrida, un bug y una entrada de bitácora → descargar | El archivo tiene la fecha y hora en que se armó y las 11 tablas, cada una con sus filas completas (todas las columnas). Están todas las filas cargadas | Auto |
| JSN-03 | Si falta correr un `.sql` | Simular que no existen las tablas nuevas | Baja igual, con las tablas que hay. El aviso dice cuáles faltaron y que falta correr `supabase/004-board.sql` | Auto |
| JSN-04 | Se puede leer | Abrir el archivo en el Bloc de notas o en el navegador | Se lee ordenado (con sangría), con acentos bien | Manual |

## G. En la dirección de prueba

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| EST-08 | Staging antes del merge | En la dirección de prueba del PR: entrar, crear y editar un proyecto, cargar un movimiento, descargar el respaldo JSON | Anda igual que en producción. El proyecto nuevo aparece en el respaldo con pulso `andando` | Manual |
| EST-09 | En el celular | En tu celular, en la dirección de prueba: descargar el respaldo | Baja el archivo; el botón entra en la pantalla | Manual |

---

## Decidido al revisar la lista (14/9/2026)

- La plata no cuenta como movimiento de trabajo del proyecto (TRG-07).
- `task_events` solo se lee desde el panel; la escribe la base al crear y al mover cada tarea (SEG-05).
- `empezada` guarda la primera vez; `pasada_a_qa` y `cerrada`, la última. `cerrada` se vacía si la
  tarea se reabre (TRG-04).
- Estado nuevo `ready` ("Lista para prod") entre `qa` y `done`; `done` quiere decir publicada.
- Un bug cargado sobre una tarea en `qa` la devuelve sola a `doing` (TRG-09 a TRG-11). La etiqueta
  "con errores" se calcula de los bugs sin cerrar y se ve en el Tablero (sprint 05).
- Si algún día la tarea tiene que guardar el link de la dirección de prueba, es un campo nuevo: se
  suma al modelo antes, en el sprint 07.
- Sumados al escribir el `.sql`: TRG-12 (la base pone `cerrado_en` al cerrar un bug) y TRG-13 (las
  fechas del ciclo no se pueden cargar a mano). Una tarea nueva es `feature` si no se dice otra cosa,
  y un bug nuevo, severidad `media`.

### Prueba local antes de producción

Antes de aplicar, los cuatro `.sql` se corrieron en un Postgres local (PGlite, sin Supabase) con un
Supabase de mentira (roles `anon` y `authenticated` y `auth.uid()`): dos veces seguidas sin error, y
43 controles de triggers, valores, seguridad y borrado, todos bien (14/9/2026). No reemplaza a los
tests: la prueba de verdad es contra Supabase.

## Resultados

| Corrida | Contra qué | Resultado |
|---|---|---|
| Antes de aplicar `004` · desarrollo (14/9/2026) | Esta rama, con producción todavía sin `004` | Suite del sprint 01: **71 pasan** · 0 fallan · 1 queda para el build. MIG-01, MIG-05 y JSN-03: pasan |
| Después de aplicar `004` · producción (14/9/2026) | `main` después del PR #10, con `004` aplicado | Suite completa: **103 pasan** · 1 falla (JSN-02, intermitente, ver abajo) · 1 queda para el build. Build: **6 pasan** |
| JSN-02 otra vez (14/9/2026) | Lo mismo | Solo: pasa (12,6 s). Tres veces seguidas con JSN-01 y JSN-03: **9 de 9 pasan**. `a-sesion` + `b-resumen` en el orden de la suite: **20 de 20 pasan** |

- **JSN-02 falló una vez de 14.** Se agotaron los 30 s del test esperando la descarga, con el botón
  todavía en "Armando el respaldo…". Solo, el test tarda unos 12 s y pasa siempre, así que la falla
  apunta a un pedido que Supabase tardó en contestar. El respaldo no tiene tiempo límite: si un pedido
  se cuelga, el botón queda en "Armando el respaldo…" y no avisa nada.
- Después de la corrida la base quedó como antes: tus filas iguales y ninguna fila de prueba.
- JSN-03 falló la primera vez por un error del test (el patrón interceptaba todas las tablas, no solo
  las del board). Corregido; el panel no tenía nada mal.

### Al aplicar

`004` se corrió primero desde el SQL Editor, el 14/9/2026 a las 17:26, y quedó fuera del historial.
A las 19:06 se volvió a correr con la herramienta de migraciones (`004_board`). Antes y después se
sacó una huella de la base: tablas, columnas, valores por defecto, restricciones, índices, políticas,
triggers, permisos, funciones y filas.

| ID | Resultado |
|---|---|
| MIG-02 | **Pasa.** La segunda corrida no dio error y no cambió nada: mismas tablas, columnas, políticas, triggers, índices, permisos y filas. La única diferencia fue el texto de las 6 funciones de `004`: desde el SQL Editor se habían guardado con los saltos de línea de Windows (`\r\n`) y ahora quedaron con `\n`. Se comprobó que es solo eso rearmando la huella de antes |
| DAT-02 | **Pasa.** El proyecto que ya estaba quedó con pulso `andando`, tipo `cliente`, sin repo ni dirección de producción y con `ultimo_movimiento` |
| DAT-08 | **Pasa.** La fecha por defecto de `journal` es `(now() at time zone 'America/Argentina/Buenos_Aires')::date`, no `current_date` |
| SEG-01 | **Pasa.** Las 7 tablas con RLS. Advisors: ninguna alerta nueva; queda solo la de contraseñas filtradas, que ya estaba |
| MIG-03 | El historial de Supabase trae `001_proyectos_y_movimientos`, `002_precios`, `003_presupuestos_pdf` y `004_board`, en ese orden (visto por la API). Belén también lo vio en la pantalla (ver abajo) |

### Manuales

Los corrió Belén el 14/9/2026. Pasaron todos.

| ID | Dónde | Resultado |
|---|---|---|
| MIG-03 | Supabase → Database → Migrations | **Pasa.** Los cuatro, en orden |
| JSN-04 | El respaldo abierto en el Bloc de notas | **Pasa** |
| EST-08 | Producción (el PR #10 ya estaba publicado, así que no se corrió en la dirección de prueba) | **Pasa** |
| EST-09 | Celular, en producción | **Pasa** |

Con esto el sprint 02 queda cerrado.
