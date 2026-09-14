# Sprint 01 — casos de prueba

Última actualización: 14/9/2026 · Borrador para que Belén lo corrija antes de arrancar el sprint.

El sprint 01 parte `public/panel/app.js` en módulos **sin cambiar nada de lo que se ve ni de lo que
hace**. Esta lista es todo lo que hoy funciona y tiene que seguir funcionando igual después.

## Cómo se usa esta lista

1. **Corrida de base, antes de tocar el código:** se corren los casos contra `main` tal como está.
   Lo que pase queda como la foto de "así anda hoy". Lo que falle se anota y **no** se arregla en el
   sprint 01 (va a la sección "Encontrados al leer el código" o a pendientes).
2. **Después de partir el archivo:** se corren los mismos casos. Tienen que dar exactamente lo mismo.
3. **Los casos "Auto"** se convierten en tests de Playwright. **Los "Manual"** los corre Belén a mano,
   porque dependen de algo que un test no ve bien: el cuadro de impresión, abrir el Excel, el celular
   de verdad.

### Con qué usuario se prueba

Los tests **no** se corren con tu usuario real: crearían y borrarían filas en tus datos. Se usa un
**usuario de prueba** en el mismo proyecto de Supabase. Como todas las tablas filtran por
`owner_id`, ese usuario ve una base vacía y nunca toca tus datos.

- Lo creás vos en Supabase → Authentication → Users → Add user, con Auto Confirm. Sirve un alias de
  tu Gmail: `bc.informatica.pna+qa@gmail.com` llega a la misma casilla y para Supabase es otra cuenta.
- Email y contraseña van en Bitwarden ("BC panel QA") y en `.env.local` como `PANEL_QA_EMAIL` y
  `PANEL_QA_PASSWORD`. Los nombres se agregan a `.env.example`.
- Cada test crea los datos que necesita y los borra al terminar.
- La inflación y el dólar se prueban con respuestas fijas (el test intercepta las dos APIs), para que
  el resultado no cambie según el mes.

---

## A. Entrada y sesión

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| LOG-01 | Entrar con contraseña | Email y contraseña correctos, destildar "entrar con un PIN", Entrar | Se ve el panel en **Resumen**; arriba a la derecha, el email y los botones "Activar PIN" y "Salir" | Auto |
| LOG-02 | Contraseña incorrecta | Email correcto, contraseña mal, Entrar | "Email o contraseña incorrectos." Sigue en el login; el botón vuelve a decir "Entrar" | Auto |
| LOG-03 | La sesión queda abierta | Entrar sin PIN y recargar la página | Entra directo al panel, sin pedir nada | Auto |
| LOG-04 | Salir | Sin PIN, tocar "Salir" y recargar | Vuelve al login y al recargar pide la contraseña | Auto |
| PIN-01 | Activar PIN al entrar | Entrar con "entrar con un PIN" tildado | Se abre "Entrada rápida con PIN" | Auto |
| PIN-02 | Validación del PIN nuevo | En el modal: PIN `12` · después `1234` y `1235` · después `1234` y `1234` | "Tienen que ser de 4 a 6 números." · "Los dos PIN no coinciden." · Se cierra, aviso "Listo: la próxima vez entrás con tu PIN." y los botones pasan a "Quitar PIN" y "Bloquear" | Auto |
| PIN-03 | "Ahora no" | En el modal de PIN, tocar "Ahora no" | Se cierra; siguen "Activar PIN" y "Salir" | Auto |
| PIN-04 | Entrar con PIN | Con PIN activo, abrir el panel en una pestaña nueva y escribir el PIN | Solo pide el PIN. Al completar los números entra solo, sin tocar "Entrar" | Auto |
| PIN-05 | PIN incorrecto y bloqueo | Escribir un PIN equivocado 5 veces | "PIN incorrecto. Te quedan 4 intentos." y así bajando ("Te queda 1 intento."). A la quinta vuelve al login con "5 intentos fallidos: entrá con tu contraseña y elegí un PIN nuevo." y el PIN queda borrado | Auto |
| PIN-06 | Recargar con la pestaña desbloqueada | Entrar con PIN y recargar | Sigue adentro, sin volver a pedir el PIN | Auto |
| PIN-07 | Bloquear | Con PIN activo, tocar "Bloquear" | Pide el PIN; con el PIN correcto vuelve a entrar | Auto |
| PIN-08 | Olvidé el PIN | En la pantalla del PIN, tocar "Entrar con email y contraseña" | Muestra el login con email y contraseña; el PIN queda borrado | Auto |
| PIN-09 | Quitar PIN | "Quitar PIN" → aceptar la pregunta | Aviso "PIN quitado."; los botones vuelven a "Activar PIN" y "Salir" | Auto |
| PIN-10 | PIN en el celular | Ancho de 375 px | El botón "Activar PIN" / "Quitar PIN" no aparece arriba | Auto |

## B. Pestañas y Resumen

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| NAV-01 | Cambiar de pestaña | Tocar Resumen, Proyectos, Movimientos, Precios | Se ve una vista por vez; la pestaña activa queda resaltada en lima | Auto |
| NAV-02 | Ir a Precios desde un aviso | Con al menos un aviso de precios, en Resumen tocar "Ver todos →" | Pasa a la pestaña Precios | Auto |
| RES-01 | Números de arriba | Cargar un ingreso de $100.000 y un egreso de $30.000 | Balance $70.000 en lima; ingresos $100.000; egresos $30.000. Con balance negativo, el número se pone rojo | Auto |
| RES-02 | Proyectos activos | Tener un proyecto activo, uno pausado y uno finalizado | "Proyectos activos" dice 1, y la tabla de la derecha muestra solo el activo | Auto |
| RES-03 | Gráfico de 6 meses | Cargar un ingreso este mes y un egreso hace 2 meses | 6 barras de mes (este y los 5 anteriores); el ingreso en lima en este mes y el egreso en rojo dos meses atrás | Auto |
| RES-04 | Últimos movimientos | Tener 10 movimientos | Muestra los 8 más nuevos, el más reciente primero | Auto |
| RES-05 | Vacío | Usuario sin datos | "Todavía no cargaste movimientos." y "No hay proyectos activos." | Auto |
| RES-06 | Avisos en Resumen | Tener 4 avisos de precios o más | Aparece "// Avisos de precios" con los 3 primeros. Sin avisos, el recuadro no aparece | Auto |

## C. Proyectos

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| PRO-01 | Crear | "+ Nuevo proyecto" → nombre, cliente, estado activo, inicio, descripción → Guardar | Aviso "Proyecto creado."; aparece en la tabla y en "Proyectos activos" del Resumen | Auto |
| PRO-02 | Nombre obligatorio | Guardar con el nombre vacío | No se guarda; el navegador marca el campo | Auto |
| PRO-03 | Editar | "Editar" en una fila → cambiar el estado a pausado → Guardar | El modal abre con los datos cargados; aviso "Proyecto actualizado."; el estado cambia en la tabla y sale de los activos | Auto |
| PRO-04 | Filtro por estado | Elegir "Pausado" | Muestra solo los pausados. Si no hay: "Todavía no cargaste ningún proyecto." | Auto |
| PRO-05 | Borrar | "Borrar" → aceptar | Pregunta "¿Borrar este proyecto? Los movimientos asociados quedan sin proyecto."; aviso "Proyecto borrado." Sus movimientos quedan con proyecto "—" | Auto |
| PRO-06 | Arrepentirse de borrar | "Borrar" → cancelar | No se borra nada | Auto |
| PRO-07 | Crear sin fecha de inicio | Crear un proyecto dejando "Inicio" vacío | **A confirmar en la corrida de base** (ver E-01) | Auto |

## D. Movimientos

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| MOV-01 | Crear ingreso | "+ Nuevo movimiento" → ingreso, $50.000 → Guardar | La fecha viene cargada con hoy; aviso "Movimiento creado."; aparece en la tabla con la etiqueta "ingreso" en lima | Auto |
| MOV-02 | Fecha de hoy de noche | Abrir "+ Nuevo movimiento" después de las 21 h | La fecha es la de **hoy**, no la de mañana | Auto |
| MOV-03 | Egreso con proyecto y categoría | Egreso, categoría "service", proyecto X → Guardar | La fila muestra "egreso" en rojo, la categoría y el nombre del proyecto | Auto |
| MOV-04 | Monto obligatorio y positivo | Guardar con monto vacío, y después con 0 | No se guarda en ninguno de los dos casos | Auto |
| MOV-05 | Editar | "Editar" → cambiar el monto → Guardar | Aviso "Movimiento actualizado."; cambian la tabla y los números del Resumen, sin recargar | Auto |
| MOV-06 | Borrar | "Borrar" → aceptar | Pregunta "¿Borrar este movimiento?"; aviso "Movimiento borrado." | Auto |
| MOV-07 | Filtros combinados | Tipo "Egresos" + un proyecto | Solo los egresos de ese proyecto | Auto |
| MOV-08 | El filtro se mantiene | Con un proyecto elegido en el filtro, crear un movimiento | Después de guardar, el filtro sigue en ese proyecto | Auto |

## E. Precios — lista, avisos y mercado

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| PRE-01 | Tarifa por hora | Sin precios · después, un precio "Sistemas" por hora de $20.000 | "—" con "cargá un precio por hora en Sistemas" · $20.000 con "de tu lista de precios" | Auto |
| PRE-02 | Crear precio | "+ Nuevo precio" → datos → Guardar | Aviso "Precio agregado."; aparece con categoría, "por <unidad>" y "este mes" | Auto |
| PRE-03 | Editar el monto sin tocar la fecha | Editar un precio viejo, cambiar solo el monto | Aviso "Precio actualizado."; el "Último ajuste" pasa a hoy | Auto |
| PRE-04 | Editar la fecha a mano | Editar cambiando monto **y** fecha | Queda la fecha que pusiste, no la de hoy | Auto |
| PRE-05 | Aviso de ajuste por tiempo | Precio con último ajuste de hace 4 meses y "revisar cada" 3 | Aviso "Ajustar" con el precio sugerido; la pestaña Precios muestra el contador; la fila tiene "Aplicar $X" | Auto |
| PRE-06 | Aviso de ajuste por inflación | Precio de este año con inflación acumulada del 5 % o más desde su mes (respuesta fija) | Aviso "Ajustar"; sugerido = precio × (1 + inflación), redondeado a $500 | Auto |
| PRE-07 | Aplicar el sugerido | "Aplicar $X" → aceptar | Pregunta "¿Pasar este precio a $X desde hoy?"; aviso "Precio actualizado."; el precio y la fecha cambian y el aviso desaparece | Auto |
| PRE-08 | Comparar con el mercado | Precio con "Comparar con" debajo del mínimo · dentro · arriba del máximo | Etiqueta "X% abajo" y aviso "Bajo" · "en rango" · "X% arriba" y aviso "Alto" | Auto |
| PRE-09 | Referencia en dólares sin dólar | Comparar con una referencia en USD y DolarAPI sin responder | La columna dice "falta el dólar"; nada se rompe | Auto |
| PRE-10 | Filtro por categoría | Elegir una categoría | Solo esa categoría | Auto |
| PRE-11 | Borrar precio | "Borrar" → aceptar | Pregunta "¿Borrar este precio de la lista?"; aviso "Precio borrado." | Auto |
| PRE-12 | Números de arriba | Presupuestos aceptados, en curso y con horas reales | "Hora real cobrada" en lima si llega a tu tarifa y en rojo si no; "Presupuestos aceptados" con "N aceptados · M en curso ($…)" | Auto |
| PRE-13 | Inflación y dólar | Con las dos APIs respondiendo (respuesta fija) | "Inflación · dólar" muestra el último mes ("inflación de agosto") y "MEP $…" | Auto |
| PRE-14 | APIs caídas | Bloquear ArgentinaDatos y DolarAPI | El panel carga igual; dice "sin datos de inflación"; no aparecen errores en pantalla | Auto |
| PRE-15 | Precios de mercado | Mirar la tabla del final | Rango, zona y fuente; el link abre en otra pestaña; arriba dice "revisado el …" | Auto |

## F. Presupuestos y PDF

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| PRS-01 | Nuevo presupuesto | "+ Nuevo presupuesto" | Categoría "Service"; textos de la plantilla ya cargados; Nº siguiente del año (`2026-00N`); "Válido hasta" = hoy + 7 días | Auto |
| PRS-02 | Cambiar de categoría | Editar a mano "Qué no incluye" y pasar a "Sistemas" | Los textos que no tocaste cambian a los de Sistemas; "Qué no incluye" queda como lo escribiste; "Válido hasta" pasa a fecha + 15 días | Auto |
| PRS-03 | Renglones de precio | Agregar uno de la lista, uno en blanco (cant 2 × $10.000) y quitar uno | El de la lista trae nombre y precio; el importe se calcula (2 × $10.000 = $20.000); al quitar, el total se actualiza | Auto |
| PRS-04 | Descuento | Descuento 10 % y después $5.000 | Muestra "Valor de lista", "Descuento − $…" y "Total" en lima, bien calculados en los dos casos | Auto |
| PRS-05 | Obligatorios | Guardar sin título · con título y sin renglones | "Poné el nombre del trabajo." · "Agregá al menos un renglón en Precio." | Auto |
| PRS-06 | Guardar | Completar y tocar "Guardar" | Aviso "Presupuesto guardado."; en la tabla: Nº, categoría, precio final y "lista $…" si hubo descuento | Auto |
| PRS-07 | Guardar y generar PDF | "Guardar y generar PDF" | Se abre una pestaña con el presupuesto con la marca de BC, el Nº, los renglones y el total | Auto |
| PRS-08 | Partes sin completar | Dejar un texto con `[corchetes]` → "Guardar y generar PDF" | Pregunta "Quedan partes para completar: …" · ¿Generar el PDF igual? Si cancelás, no guarda | Auto |
| PRS-09 | Volver a generar el PDF | Botón "PDF" de una fila | El mismo documento que se generó al guardarlo (mismo Nº, mismos textos) | Auto |
| PRS-10 | Editar | "Ver / editar" → cambiar el estado a "enviado" → Guardar | Abre todo como se guardó (renglones, descuento, textos, lo interno); aviso "Presupuesto actualizado." | Auto |
| PRS-11 | Horas y precio por hora | Horas estimadas 10 y después horas reales 8 | Ayuda "Con 10 h a tu tarifa de $… serían $…"; debajo "$… por hora real"; en la tabla, la etiqueta de por hora en lima o rojo según la tarifa | Auto |
| PRS-12 | Aviso por hora baja | Presupuesto con horas reales que den menos que la tarifa | Aviso "Bajo": "… te quedó a $X la hora …" | Auto |
| PRS-13 | Aviso por mucho descuento | Presupuesto aceptado con un descuento de más del 15 % | Aviso "Bajo": "… cobraste $X, N% menos que tu precio de lista …" | Auto |
| PRS-14 | Caso para la landing | Tildar "Se puede contar como caso en la landing" | La fila muestra "· caso para la landing" | Auto |
| PRS-15 | Filtro y borrar | Filtrar por "Aceptado"; borrar uno | Solo aceptados; pregunta "¿Borrar este presupuesto?"; aviso "Presupuesto borrado." | Auto |
| PRS-16 | Guardar como PDF de verdad | En la pestaña del presupuesto, imprimir → "Guardar como PDF" | El PDF sale en A4 con las fuentes de la marca, sin cortes raros | Manual |
| PRS-17 | Ventanas emergentes bloqueadas | Bloquear las ventanas emergentes del sitio y tocar "PDF" | Aviso "El navegador bloqueó la pestaña nueva: permití las ventanas emergentes para este sitio." | Manual |

## G. Excel de respaldo

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| XLS-01 | Descargar | En Resumen, "Descargar Excel" | El botón dice "Armando el Excel…" y se desactiva; baja `BC-Informatica-seguimiento-AAAA-MM-DD.xlsx`; aviso "Excel descargado." | Auto |
| XLS-02 | Hojas y datos | Abrir el archivo descargado | 5 hojas: Resumen mensual, Movimientos, Proyectos, Presupuestos, Precios. Cabeceras en lima, fechas sin correrse un día, totales iguales a los del panel | Auto |
| XLS-03 | Fórmulas vivas | En Excel o Google Drive, agregar un movimiento a mano en la hoja Movimientos | El Resumen mensual y los totales por proyecto se recalculan solos | Manual |

## H. Propios del sprint 01 (que partir el archivo no rompa nada)

| ID | Qué se prueba | Pasos | Resultado esperado | Cómo |
|---|---|---|---|---|
| EST-01 | Consola limpia | Entrar y recorrer las 4 pestañas, abrir y cerrar cada modal | Ningún error en la consola del navegador | Auto |
| EST-02 | Todos los archivos cargan | Mirar la red al abrir `/panel` | Ningún archivo del panel da 404; todos se piden con ruta `/panel/...` | Auto |
| EST-03 | `/panel` con y sin barra | Abrir `/panel` y `/panel/` | Los dos cargan el panel | Auto |
| EST-04 | En el build de producción | `npm run build` y `npm run preview`, correr LOG-01, MOV-01 y PRS-07 | Igual que en desarrollo | Auto |
| EST-05 | En Vercel | En la dirección de prueba del PR: entrar con contraseña, cargar un movimiento, generar un PDF | Anda igual que en producción | Manual |
| EST-06 | La landing no cambió | Abrir `/` y recorrer sus pestañas | Igual que antes | Auto |
| EST-07 | En el celular | Ancho de 375 px: recorrer las pestañas y abrir el modal de presupuesto | Las pestañas se desplazan de costado; los modales se pueden completar y guardar | Auto + Manual en tu celular |

---

## Encontrados al leer el código (a confirmar en la corrida de base)

No se arreglan en el sprint 01, que no cambia comportamiento. Si se confirman, pasan a pendientes
en `BASE-CONOCIMIENTO.md` y se decide cuándo se arreglan.

| ID | Qué pasa | Por qué | Cómo se confirma |
|---|---|---|---|
| E-01 | Probablemente no se puede crear un proyecto sin fecha de inicio | El formulario manda la fecha vacía como texto `""` y la base no lo acepta como fecha | PRO-07: si sale "Error: invalid input syntax for type date", está confirmado |
| E-02 | Un nombre con comillas se corta al editar | Nombres, clientes y descripciones de proyectos y movimientos se escriben sin escapar. `Monitor 24"` aparece como `Monitor 24` en el modal, y si guardás, se guarda cortado | Crear un proyecto `Monitor 24"`, tocar Editar y mirar el campo Nombre |
| E-03 | Tocar afuera de un modal lo cierra sin preguntar | Pasa en todos los modales. En el de presupuesto se pierde todo lo cargado | Cargar medio presupuesto y tocar el fondo oscuro |

Una diferencia menor, que puede ser a propósito: la categoría de los movimientos no tiene "abonos",
y la de precios y presupuestos sí.
