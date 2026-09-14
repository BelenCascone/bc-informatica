# Sprint 03 — casos de prueba

Última actualización: 14/9/2026 · **Borrador para revisar.** Belén lo corrige y recién ahí se escribe
código.

El sprint 03 cambia cómo se recorre el panel: las pestañas de arriba pasan a una barra lateral con
dos grupos (Trabajo / Plata), cada vista tiene su dirección (`/panel#/inicio`) e **Inicio** pasa a
ser la pantalla de entrada. Además, el respaldo JSON deja de quedarse colgado si Supabase no contesta.
El alcance está en [`docs/roadmap-panel.md`](../roadmap-panel.md), secciones 4, 5 y 7.

## Cómo se usa esta lista

- **Auto:** test de Playwright, con el **usuario de prueba**. **Manual:** los corre Belén a mano.
- Todo lo que cargan los tests lleva el prefijo `QA · ` y se borra al terminar, como en los sprints
  anteriores.
- Los tests nuevos van en `tests/panel/j-menu.spec.js` (secciones A y B), `tests/panel/k-inicio.spec.js`
  (sección C) y `tests/panel/b-resumen.spec.js` (sección D, el botón está en Resumen).
- Los montos de los ejemplos son inventados; el repo es público.
- **"El mes"** es el mes en curso, en Argentina. **"Los últimos 3 meses"** son los tres meses
  completos anteriores: hoy, 14/9, son junio, julio y agosto.
- **"Proyecto abierto"** es el que está `activo` o `pausado`; los `finalizado` no cuentan.

---

## A. Barra lateral

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| MEN-01 | Grupos y orden | Entrar al panel en la compu | A la izquierda, fija: **Trabajo** (Inicio · Proyectos · Tablero · QA · Bitácora · Métricas) y **Plata** (Resumen · Movimientos · Precios). Arriba quedan el logo, tu email, "Activar PIN" y "Salir". Ya no hay pestañas arriba | Auto |
| MEN-02 | Las que todavía no existen | Mirar Tablero, QA, Bitácora y Métricas, y tocarlas | Se ven apagadas, cada una con el sprint en que llega (Tablero 05, QA 07, Bitácora 08, Métricas 09). Tocarlas no hace nada: no cambia la vista ni la dirección | Auto |
| MEN-03 | Cambiar de vista | Tocar Inicio, Proyectos, Resumen, Movimientos y Precios | Se ve una sola vista por vez. En la barra queda marcada, en lima, solo la vista que estás mirando (reemplaza a NAV-01) | Auto |
| MEN-04 | Contador de avisos | Con un precio para ajustar, entrar | El número de avisos aparece al lado de "Precios" en la barra, como antes en la pestaña. Sin avisos, no aparece | Auto |
| MEN-05 | Barra fija | En una vista larga (Precios), bajar hasta el final | La barra no se mueve: sigue a la vista | Auto |
| MEN-06 | En el celular | Con pantalla de celular: entrar, tocar ☰, elegir Movimientos. Abrir de nuevo y cerrar con ✕, tocando afuera y con Esc | La barra no se ve hasta tocar ☰; se abre por encima de la vista. Al elegir Movimientos se cierra y se ve Movimientos. Con ✕, tocando afuera o con Esc se cierra y la vista no cambia. Nada queda tapado ni hay que desplazarse de costado | Auto |

## B. Direcciones

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| DIR-01 | Cada vista su dirección | Tocar cada vista en la barra | La dirección cambia a `#/inicio`, `#/proyectos`, `#/resumen`, `#/movimientos`, `#/precios` | Auto |
| DIR-02 | Entrar directo a una vista | Con sesión abierta, abrir `/panel/index.html#/movimientos` | Se abre Movimientos, marcado en la barra | Auto |
| DIR-03 | Atrás y adelante | Inicio → Proyectos → Precios; atrás dos veces; adelante una | Atrás: Proyectos y después Inicio. Adelante: Proyectos. La barra acompaña | Auto |
| DIR-04 | Recargar | En `#/precios`, recargar la página | Sigue en Precios | Auto |
| DIR-05 | Dirección vacía o que no existe | Abrir `/panel/index.html`, `#/cualquiera` y `#/tablero` (todavía no existe) | Las tres llevan a Inicio y la dirección pasa a `#/inicio`. El botón atrás no vuelve a la dirección rota | Auto |
| DIR-06 | Sin sesión | Sin entrar, abrir `#/precios`; entrar con la contraseña. Repetir entrando con PIN | Primero pide entrar; después queda en Precios, las dos veces | Auto |
| DIR-07 | Ir a Precios desde un aviso | Con un precio para ajustar: "Ver todos →" en Resumen, y el aviso de precios en Inicio | Los dos llevan a Precios con `#/precios` (reemplaza a NAV-02) | Auto |

## C. Inicio

### Al entrar y números generales

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-01 | Pantalla de entrada | Entrar con contraseña, y con PIN | Se ve Inicio, marcado en la barra, con `#/inicio` (antes era Resumen: cambia lo que espera LOG-01) | Auto |
| INI-02 | Números generales | Un proyecto activo, uno pausado y uno finalizado. Este mes: ingreso de $100.000 y egreso de $130.000. El mes pasado: ingreso de $500.000 | Proyectos abiertos: **2**. Ingresos del mes: $100.000. Egresos del mes: $130.000. Balance del mes: −$30.000, en rojo. Lo del mes pasado no suma | Auto |
| INI-03 | Tareas del sprint | Sin sprints activos. Después: un sprint activo con 3 tareas (una `done`, una `ready`, una `doing`) y un sprint planeado con 2 tareas `done` | Sin sprint activo: "todavía no hay tareas". Con el sprint: **1 de 3** (`ready` todavía no está publicada, no cuenta como hecha). Las del sprint planeado no cuentan | Auto |

### Proyectos abiertos

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-04 | Pulso y próximo paso | Dos proyectos abiertos, uno con pulso `en_llamas` y próximo paso "Mandar el presupuesto"; otro recién creado. Uno finalizado | Una fila por proyecto abierto: nombre, cliente, pulso con su color y próximo paso ("—" si no tiene). El de movimiento más reciente, arriba. El finalizado no aparece. Solo se mira: el pulso se edita en el sprint 04 | Auto |
| INI-05 | Sin proyectos abiertos | Solo proyectos finalizados | "No hay proyectos abiertos." | Auto |

### Plata del mes

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-06 | Este mes contra el anterior | Movimientos en el mes y en el anterior | Ingresos, egresos y balance de los dos meses, uno al lado del otro | Auto |
| INI-07 | Por categoría y por proyecto | Este mes: egresos en "Hosting" y sin categoría; un ingreso con proyecto y otro sin | Ingresos y egresos del mes agrupados por categoría ("Sin categoría" para los que no tienen) y por proyecto ("Sin proyecto") | Auto |
| INI-08 | Lo que falta cobrar | Proyecto A: presupuesto aceptado de $300.000 e ingresos por $100.000 (de cualquier mes). Proyecto B: aceptado de $50.000 y cobrado entero. Un presupuesto enviado y uno aceptado sin proyecto | A: faltan **$200.000**. B no aparece. El enviado no cuenta. El aceptado sin proyecto no entra en la cuenta y se avisa: "1 presupuesto aceptado sin proyecto: no se puede saber si se cobró" | Auto |

### Gastos que se repiten

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-09 | Qué se repite | Egresos en los últimos 3 meses: "Hosting" en julio y agosto; "Canva" en junio y "canva " en agosto; "Dominio" solo en agosto; un ingreso "Abono" en los tres meses; "Monitor" solo este mes | Aparecen Hosting y Canva (mayúsculas, acentos y espacios de más no importan). Dominio (un solo mes), Abono (es ingreso) y Monitor (es de este mes) no | Auto |
| INI-10 | Cuánto suman | Hosting: $10.000 en julio y $12.000 en agosto. Canva: $8.000 | Cada gasto con lo último que pagaste (Hosting $12.000). Total por mes: $20.000 | Auto |
| INI-11 | Qué parte de tus ingresos y cuáles subieron | Lo mismo, con ingresos de $100.000 por mes en los 3 meses | Los gastos fijos se llevan el **20 %** de tus ingresos. Hosting dice que subió **20 %** respecto del pago anterior; Canva no dice nada | Auto |
| INI-12 | Margen libre | Tres casos: ingresos promedio de $100.000 con fijos de $20.000 · de $22.000 con fijos de $20.000 · de $15.000 con fijos de $20.000. Y uno sin ingresos en los 3 meses | Margen de $80.000, en lima · $2.000: "margen chico" (menos del 20 % de tus ingresos) · −$5.000, en rojo: "no te entra otra suscripción" · sin ingresos: "Sin ingresos en los últimos 3 meses: no se puede calcular" | Auto |
| INI-13 | "¿La seguís usando?" | Mirar la lista de gastos fijos | Cada gasto lleva la pregunta, para que lo revises vos. No hay nada para contestar ni se guarda nada | Auto |
| INI-14 | Sin gastos que se repitan | Sin egresos repetidos | "Todavía no hay gastos que se repitan en los últimos 3 meses." | Auto |

### Ideas para mejorar

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-15 | Precios para ajustar | Dos precios con el último ajuste hace 4 meses | "2 precios para revisar", con enlace a Precios | Auto |
| INI-16 | Proyecto dormido | Proyecto abierto sin movimiento hace 20 días; otro hace 10; uno finalizado hace 60 | Solo el de 20 días: "no se mueve hace 20 días: ¿lo cerrás, lo pausás o lo retomás?". El test cambia la fecha en la respuesta de la base, porque `ultimo_movimiento` no se puede cargar a mano | Auto |
| INI-17 | Presupuesto sin respuesta | Presupuestos enviados con fecha de hace 8 días y de hace 6; uno aceptado de hace un mes | Solo el de 8 días: "enviado hace 8 días, sin respuesta" | Auto |
| INI-18 | Cobro pendiente | El proyecto A de INI-08 | "Falta cobrar $200.000 de A" | Auto |
| INI-19 | Mes en rojo | El mes pasado cerró con más egresos que ingresos; este mes vas igual | Un aviso por cada uno: "el mes pasado cerró con más egresos que ingresos" y "este mes vas con más egresos que ingresos" | Auto |
| INI-20 | Sprint vencido | Sprint activo que terminó ayer, con una tarea sin publicar; otro vencido con todo `done` | Solo el primero: "el sprint N de X terminó el …, y le queda 1 tarea". El que tiene todo hecho no avisa | Auto |
| INI-21 | Nada para mejorar | Sin nada de lo anterior | "Nada para revisar." | Auto |

### Si falta algo y en el celular

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| INI-22 | Si falta correr `004` | Simular que no existen las tablas de sprints y tareas | Inicio muestra un recuadro que dice que falta correr `supabase/004-board.sql`. Lo demás de Inicio (plata, gastos, ideas) anda igual | Auto |
| INI-23 | Vacío | Usuario de prueba sin datos | Inicio no da errores: cada bloque dice que no hay datos | Auto |
| INI-24 | En pantalla de celular | Inicio con datos, en pantalla de celular | Se lee todo sin desplazarse de costado; los bloques van uno debajo del otro | Auto |

## D. Respaldo con tiempo límite

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| JSN-05 | Supabase no contesta | Simular que un pedido del respaldo nunca contesta; tocar "Descargar respaldo (JSON)" | A los 20 segundos el botón vuelve a "Descargar respaldo (JSON)" y se puede tocar de nuevo. Aviso: "No se pudo armar el respaldo: Supabase no contestó. Probá de nuevo." No baja ningún archivo | Auto |

## E. Lo que no cambia

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| REG-01 | La suite de los sprints 01 y 02 | Correrla entera | Pasa, con estos cambios: LOG-01 espera Inicio en vez de Resumen; NAV-01 y NAV-02 salen (los reemplazan MEN-03 y DIR-07); EST-01 (consola limpia) recorre también Inicio; los tests pasan de vista con la barra lateral | Auto |
| REG-02 | Resumen sigue igual | Ir a Resumen | Mismos números totales, gráfico de 6 meses, últimos movimientos, proyectos activos, Excel y respaldo JSON | Auto |

## F. En la dirección de prueba

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| EST-10 | Staging antes del merge | En la dirección de prueba del PR: entrar, pasar por todas las vistas desde la barra, usar atrás, guardar `/panel#/precios` de favorito y abrirlo | Anda igual que en local; el favorito abre Precios (en Vercel `/panel` sin `index.html`) | Manual |
| EST-11 | En tu celular | En la dirección de prueba: abrir el menú, recorrer las vistas, leer Inicio | El menú se abre y se cierra bien; Inicio se lee sin desplazarse de costado | Manual |

---

## Decidido antes de escribir la lista (14/9/2026)

- La barra muestra las diez vistas desde ahora; las que todavía no existen se ven apagadas, con el
  sprint en que llegan.
- "¿La seguís usando?" en los gastos fijos solo se pregunta: no se guarda la respuesta y no hay
  campos nuevos. Si después hace falta guardarla, se suma primero al roadmap.
- El respaldo JSON deja de quedarse colgado: tiempo límite de 20 segundos por pedido.

## Para que Belén confirme al revisar

- "Proyecto abierto" = `activo` o `pausado`.
- "Últimos 3 meses" = los tres meses completos anteriores al actual (para los gastos fijos y el
  promedio de ingresos). Así el mes a medias no tira el promedio para abajo; la contra es que una
  suscripción nueva tarda un mes más en aparecer.
- "Margen chico" = menos del 20 % de tus ingresos promedio.
- En "Ideas", el mes en rojo mira el mes en curso y el anterior.
- Resumen no cambia: sigue con los totales de siempre, aunque Inicio muestre los del mes.
