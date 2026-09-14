// Presupuesto para el cliente: plantillas por categoría y el documento con la marca de BC
// (la de la landing, igual que la propuesta de AUMÉ). El documento se abre en una pestaña nueva
// y se guarda como PDF desde el cuadro de impresión del navegador: así sale con texto real,
// liviano y con las mismas fuentes que la web.

const CONTACTO = "BC INFORMÁTICA · PARANÁ, ENTRE RÍOS · WHATSAPP 343 503-8054 · @BC.INFORMATICA.PNA";

const BR = '<svg class="br" viewBox="0 0 62 100" aria-hidden="true"><path d="M52 8 L10 50 L52 92 L52 62 L31 50 L52 38 Z"/></svg>';
const ISO = `<span class="iso">${BR}<span class="slash">/</span><span class="bc">BC</span>${BR.replace('class="br"', 'class="br br--r"')}</span>`;

// ---------- plantillas: lo que ya viene cargado al elegir la categoría ----------
const PAGO_Y_CAMBIOS = [
  "Cambios: Si en el camino aparece algo que no estaba previsto, te consulto antes de seguir.",
];

const PLANTILLAS = {
  service: {
    validez_dias: 7,
    propuesta_intro: "Reviso el equipo, hago lo que figura abajo y te lo devuelvo andando.",
    propuesta: [
      "Respaldo de tus archivos: antes de tocar nada, copio lo importante.",
      "Limpieza interna y cambio de pasta térmica: el equipo deja de calentarse y de apagarse solo.",
      "Prueba final: te lo entrego funcionando y te muestro lo que se hizo.",
    ],
    no_incluye: [
      "Repuestos: se cotizan el día que se compran, porque el precio cambia seguido. Nunca se compra nada sin avisarte.",
      "Licencias de programas pagos.",
      "Retiro y entrega a domicilio: si lo querés, se suman $ 5.000 por las dos cosas.",
    ],
    plazos: ["Entrega del equipo: en el día o en dos días desde que lo recibo"],
    condiciones: [
      "Forma de pago: Al entregar el equipo, por transferencia o en efectivo.",
      "Garantía: Una semana. Si en esos días vuelve a aparecer el problema, escribime y lo reviso.",
      ...PAGO_Y_CAMBIOS,
    ],
    cierre: "Si te cierra, avisame por WhatsApp y coordinamos cuándo me acercás el equipo o cuándo paso a buscarlo.",
  },
  sistemas: {
    validez_dias: 15,
    propuesta_intro: "",
    propuesta: [
      "Relevamiento: charlamos cómo trabajás hoy y dejo por escrito qué tiene que hacer el sistema.",
      "Desarrollo: [qué pantallas y funciones lleva].",
      "Pruebas y ajustes: lo probamos con datos reales antes de darlo por terminado.",
      "Capacitación: te muestro cómo usarlo y te dejo un instructivo corto para tener a mano.",
    ],
    no_incluye: [
      "Cobro online y facturación electrónica, salvo que figuren arriba.",
      "El dominio y los servicios de terceros: los pagás directamente y quedan a tu nombre.",
      "Cambios que no estén en esta propuesta: se cotizan aparte, siempre antes de hacerlos.",
    ],
    plazos: [
      "Relevamiento: la primera semana",
      "Desarrollo: [cuántas semanas]",
      "Pruebas, capacitación y entrega: la última semana",
    ],
    condiciones: [
      "Forma de pago: La mitad al aceptar la propuesta y la otra mitad en la entrega. Por transferencia o en efectivo, en pesos.",
      "Garantía: 90 días sobre el trabajo entregado. Si algo no funciona como está descripto acá, lo arreglo sin costo.",
      "Cambios en el alcance: Si en el camino aparece algo distinto a lo previsto, te aviso y te paso un presupuesto nuevo antes de seguir.",
      "Tus datos: El sistema y la información que cargues son tuyos. Si algún día dejás el mantenimiento, te entrego todo para que lo pueda seguir otra persona.",
    ],
    abono_incluye: [
      "Servidor y base de datos andando, con copias de seguridad.",
      "Arreglos sin costo extra si algo de lo entregado deja de funcionar.",
      "Actualizaciones de seguridad.",
    ],
    cierre: "Si te cierra, firmamos acá abajo y arranco. Cualquier punto que no te cierre, lo charlamos.",
  },
  clases: {
    validez_dias: 15,
    propuesta_intro: "Clases a domicilio, una por semana, con el temario armado según para qué lo necesitás.",
    propuesta: [
      "Cuatro clases al mes: de una hora cada una, en tu domicilio en Paraná.",
      "Material y ejercicios preparados para vos: no es un curso enlatado.",
      "Consultas entre clase y clase: si te trabás con algo, me escribís.",
    ],
    no_incluye: [
      "Programas o licencias pagas que haga falta comprar.",
      "Clases fuera de Paraná y alrededores (online sí).",
    ],
    plazos: ["Primera clase: la semana que elijas"],
    condiciones: [
      "Forma de pago: Por mes, por transferencia o en efectivo.",
      "Reprogramación: Si una semana no podés, la reprogramamos dentro del mismo mes.",
    ],
    cierre: "Si te cierra, avisame por WhatsApp y arreglamos el día y el horario de la primera clase.",
  },
  asesoria: {
    validez_dias: 15,
    propuesta_intro: "",
    propuesta: [
      "Relevamiento: reviso lo que tenés hoy (equipos, programas, copias de seguridad o accesos).",
      "Recomendación por escrito: qué conviene hacer, en qué orden y cuánto sale cada cosa.",
      "Acompañamiento: si lo necesitás, te ayudo a ponerlo en marcha.",
    ],
    no_incluye: [
      "La compra de equipos o licencias: te digo qué conviene, pero la compra es tuya.",
      "Trabajos de service o desarrollo que surjan de la recomendación: se presupuestan aparte.",
    ],
    plazos: ["Recomendación por escrito: [cuántos días] después de la visita"],
    condiciones: [
      "Forma de pago: Al entregar la recomendación, por transferencia o en efectivo.",
      ...PAGO_Y_CAMBIOS,
    ],
    cierre: "Si te cierra, avisame por WhatsApp y coordinamos el día.",
  },
  abonos: {
    validez_dias: 15,
    propuesta_intro: "Un abono mensual para que la tecnología de tu negocio no se frene.",
    propuesta: [
      "Soporte por WhatsApp: consultas y problemas del día a día.",
      "Mantenimiento preventivo: [cada cuánto y qué equipos].",
      "Copias de seguridad: controlo que se hagan y que se puedan recuperar.",
    ],
    no_incluye: [
      "Repuestos y equipos nuevos: se cotizan aparte y nunca se compra nada sin avisarte.",
      "Trabajos grandes que no entren en el abono: se presupuestan aparte, antes de hacerlos.",
    ],
    plazos: [],
    condiciones: [
      "Forma de pago: Por mes adelantado, por transferencia o en efectivo.",
      "Ajuste: El valor se ajusta cada tres meses según la inflación que publica el INDEC.",
      "Baja: Se puede dar de baja avisando con 30 días de anticipación.",
    ],
    cierre: "Si te cierra, avisame por WhatsApp y arrancamos el mes que viene.",
  },
  otros: {
    validez_dias: 15,
    propuesta_intro: "",
    propuesta: [],
    no_incluye: [],
    plazos: [],
    condiciones: ["Forma de pago: Por transferencia o en efectivo.", ...PAGO_Y_CAMBIOS],
    cierre: "Si te cierra, avisame por WhatsApp y arrancamos.",
  },
};

// Campos de texto que salen de la plantilla, ya como texto de formulario (un renglón por línea).
export function plantilla(categoria) {
  const p = PLANTILLAS[categoria] || PLANTILLAS.otros;
  return {
    validez_dias: p.validez_dias,
    propuesta_intro: p.propuesta_intro || "",
    includes: (p.propuesta || []).join("\n"),
    no_incluye: (p.no_incluye || []).join("\n"),
    plazos: (p.plazos || []).join("\n"),
    condiciones: (p.condiciones || []).join("\n"),
    abono_incluye: (p.abono_incluye || []).join("\n"),
    cierre: p.cierre || "",
  };
}

// Partes entre corchetes que quedaron de la plantilla y hay que completar antes de mandar.
export function pendientes(textos) {
  return textos.flatMap((t) => String(t || "").match(/\[[^\]\n]+\]/g) || []);
}

// El descuento va en porcentaje (descuento_tipo "pct") o en pesos ("monto").
export function calcularTotales(doc) {
  const subtotal = (doc.items || []).reduce((s, it) => s + (Number(it.cant) || 0) * (Number(it.precio) || 0), 0);
  const valor = Math.max(0, Number(doc.descuento) || 0);
  const enPesos = doc.descuento_tipo === "monto";
  const pct = enPesos ? null : Math.min(100, valor);
  const descuento = enPesos ? Math.min(subtotal, Math.round(valor)) : Math.round((subtotal * pct) / 100);
  return { subtotal, pct, descuento, total: subtotal - descuento };
}

// ---------- documento ----------
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pesos = (n) => "$ " + Math.round(Number(n) || 0).toLocaleString("es-AR");
const fechaLarga = (iso) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—";
const lineas = (t) => String(t || "").split("\n").map((l) => l.trim()).filter(Boolean);
const dos = (n) => String(n).padStart(2, "0");

// "Título: detalle" → el título va en negrita. Sin dos puntos, el renglón sale entero.
function partir(linea) {
  const i = linea.indexOf(":");
  if (i > 0 && i <= 80 && linea.slice(i + 1).trim()) return [linea.slice(0, i).trim(), linea.slice(i + 1).trim()];
  return ["", linea];
}
const lista = (ls, clase = "") =>
  `<ul>${ls
    .map((l) => {
      const [t, r] = partir(l);
      return `<li${clase ? ` class="${clase}"` : ""}><span>${t ? `<b>${esc(t)}:</b> ` : ""}${esc(r)}</span></li>`;
    })
    .join("")}</ul>`;

export function nombreArchivo(q, doc) {
  const partes = ["Presupuesto", doc.numero, q.client_name, "BC Informatica"].filter(Boolean);
  return partes.join(" - ").replace(/[\\/:*?"<>|]/g, "");
}

export function documentoHTML(q, doc, { imprimir = true } = {}) {
  const secciones = [];
  const sec = (titulo, html) => secciones.push({ titulo, html });

  const situacion = lineas(doc.situacion);
  if (situacion.length) sec("Qué me contaste", situacion.map((p) => `<p>${esc(p)}</p>`).join(""));

  const propuesta = lineas(q.includes);
  if (doc.propuesta_intro || propuesta.length) {
    sec("Qué te propongo", (doc.propuesta_intro ? `<p>${esc(doc.propuesta_intro)}</p>` : "") + (propuesta.length ? lista(propuesta) : ""));
  }

  const noIncluye = lineas(doc.no_incluye);
  if (noIncluye.length) sec("Qué no incluye", lista(noIncluye, "no"));

  const plazos = lineas(doc.plazos).map(partir);
  if (plazos.length) {
    sec("Plazos", `<table class="junta"><thead><tr><th style="width:52%">Etapa</th><th>Cuándo</th></tr></thead><tbody>${plazos
      .map(([t, r]) => (t ? `<tr><td>${esc(t)}</td><td>${esc(r)}</td></tr>` : `<tr><td colspan="2">${esc(r)}</td></tr>`))
      .join("")}</tbody></table>`);
  }

  const items = (doc.items || []).filter((it) => it.concepto || Number(it.precio));
  if (items.length) {
    const { subtotal, pct, descuento, total } = calcularTotales({ ...doc, items });
    const conCant = items.some((it) => Number(it.cant) !== 1);
    const cols = conCant ? 4 : 2;
    const filas = items
      .map((it) => {
        const importe = (Number(it.cant) || 0) * (Number(it.precio) || 0);
        return `<tr><td>${esc(it.concepto)}${it.detalle ? `<div class="desc">${esc(it.detalle)}</div>` : ""}</td>${
          conCant ? `<td class="num">${esc(String(it.cant).replace(".", ","))}</td><td class="num">${pesos(it.precio)}</td>` : ""
        }<td class="num">${pesos(importe)}</td></tr>`;
      })
      .join("");
    const vacias = "<td></td>".repeat(cols - 2);
    const desc = descuento
      ? `<tr class="sub"><td>Valor de lista</td>${vacias}<td class="num">${pesos(subtotal)}</td></tr>
         <tr class="desc-row"><td>Descuento${pct != null ? ` (${esc(String(pct).replace(".", ","))} %)` : ""}${doc.descuento_motivo ? `<div class="desc">${esc(doc.descuento_motivo)}</div>` : ""}</td>${vacias}<td class="num">− ${pesos(descuento)}</td></tr>`
      : "";
    sec("Inversión", `<table><thead><tr><th style="width:${conCant ? 52 : 70}%">Concepto</th>${
      conCant ? '<th class="num">Cant.</th><th class="num">Unitario</th>' : ""
    }<th class="num">Importe</th></tr></thead><tbody>${filas}${desc}
      <tr class="total"><td colspan="${cols}"><div class="tot"><span class="rot">Total</span><span class="monto">${pesos(total)}</span></div></td></tr></tbody></table>`);
  }

  if (Number(doc.abono_monto) > 0) {
    const incluye = lineas(doc.abono_incluye);
    sec("Abono mensual", `<p class="precio-abono">${pesos(doc.abono_monto)}<small>por mes</small></p>${incluye.length ? lista(incluye) : ""}`);
  }

  const condiciones = lineas(doc.condiciones).map(partir);
  if (condiciones.length) {
    sec("Condiciones", `<div class="condiciones">${condiciones
      .map(([k, v]) => `<div class="cond">${k ? `<div class="k">${esc(k)}</div>` : ""}<div class="v">${esc(v)}</div></div>`)
      .join("")}</div>`);
  }

  const cuerpo = secciones
    .map((s, i) => `<section class="bloque"><h2><span class="n">${dos(i + 1)}</span> ${s.titulo}</h2>${s.html}</section>`)
    .join("");

  const cliente = q.client_name || "";
  const eyebrow = ["sistemas", "asesoria", "abonos"].includes(q.category) ? "Propuesta de trabajo" : "Presupuesto";
  const titulo = nombreArchivo(q, doc);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap">
<style>${CSS}</style>
</head>
<body>
<div class="barra">
  <div class="barra-txt"><b>${esc(eyebrow)} ${esc(doc.numero || "")}</b>${cliente ? ` · ${esc(cliente)}` : ""}
    <span>En el cuadro que se abre, elegí <b>Guardar como PDF</b> como destino.</span></div>
  <button class="b b--lima" onclick="window.print()">Guardar PDF</button>
  <button class="b" onclick="window.close()">Cerrar</button>
</div>
<article class="doc">
  <header class="portada">
    <div class="marca">${ISO}<span class="marca-txt">Informática<small>Service · Clases · Desarrollo</small></span></div>
    <div class="eyebrow">// ${esc(eyebrow)}</div>
    <h1 class="titulo">${esc(q.title)}</h1>
    <div class="regla"></div>
    <div class="datos">
      <div class="dato"><div class="k">Preparado para</div><div class="v">${esc(cliente) || "—"}</div></div>
      <div class="dato"><div class="k">Nº</div><div class="v">${esc(doc.numero) || "—"}</div></div>
      <div class="dato"><div class="k">Fecha</div><div class="v">${fechaLarga(q.date)}</div></div>
      <div class="dato"><div class="k">Válido hasta</div><div class="v">${fechaLarga(doc.valida_hasta)}</div></div>
    </div>
  </header>
  <div class="cuerpo">
    ${cuerpo}
    <section class="bloque final">
      <div class="cierre">
        <div class="txt"><h3>¿Arrancamos?</h3>${doc.cierre ? `<p>${esc(doc.cierre)}</p>` : ""}</div>
        <div class="sello">${ISO}</div>
      </div>
      <h2><span class="n">${dos(secciones.length + 1)}</span> Conformidad</h2>
      <div class="firmas">
        <div><div class="firma"></div><div class="rot">Firma y aclaración${cliente ? ` · ${esc(cliente)}` : ""}</div></div>
        <div><div class="firma"></div><div class="rot">Belén Cascone · BC Informática</div></div>
      </div>
      <p class="nota">Fecha: ____ / ____ / ________</p>
    </section>
    <footer class="pie-pantalla">${CONTACTO}</footer>
  </div>
</article>
${imprimir ? `<script>
  // Espera a que carguen las fuentes para que el PDF salga con la tipografía de la marca.
  window.addEventListener("load", function () {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(function () { window.print(); }, 300); });
  });
</script>` : ""}
</body>
</html>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--ground:#121412;--lime:#C6FF00;--circuit:#1B4332;--cream:#FBF8E6;--muted:#8F9E8B;
  --tinta:#121412;--gris:#55605A;--linea:#DCE0D6;
  --f-display:'Space Grotesk','Segoe UI',system-ui,sans-serif;
  --f-mono:'JetBrains Mono',ui-monospace,monospace;
  --f-body:'Inter','Segoe UI',system-ui,sans-serif}
html{background:#5f625f}
body{font-family:var(--f-body);color:var(--tinta);font-size:9.8pt;line-height:1.5;-webkit-font-smoothing:antialiased}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* barra de arriba: sólo en pantalla */
.barra{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px;
  background:#121412;color:#FBF8E6;font-family:var(--f-mono);font-size:12.5px;border-bottom:1px solid rgba(198,255,0,.2)}
.barra-txt{flex:1;min-width:0}
.barra-txt span{display:block;color:#8F9E8B;font-size:11.5px}
.b{cursor:pointer;border:1px solid rgba(143,158,139,.4);background:none;color:#FBF8E6;border-radius:4px;
  padding:8px 14px;font:600 12.5px var(--f-mono)}
.b--lima{background:var(--lime);color:#121412;border-color:var(--lime)}

.doc{width:210mm;max-width:100%;margin:10mm auto;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.35);overflow:hidden}

/* isotipo </BC>: los signos < > calados; la barra y BC, macizas */
.iso{display:inline-flex;align-items:center;font-family:var(--f-mono);font-weight:700;letter-spacing:-.02em;line-height:1;white-space:nowrap}
.iso .br{height:.92em;width:auto;flex:none;fill:none;stroke:currentColor;stroke-width:7;stroke-linejoin:round;stroke-linecap:round}
.iso .br--r{transform:scaleX(-1)}
.iso .slash{margin:0 .04em}

/* portada */
.portada{background:var(--ground);color:var(--cream);padding:13mm 18mm 12mm;position:relative;overflow:hidden}
.portada::before{content:"";position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(198,255,0,.07) .25mm,transparent .25mm),linear-gradient(90deg,rgba(198,255,0,.07) .25mm,transparent .25mm);
  background-size:9mm 9mm}
.portada::after{content:"";position:absolute;top:-40mm;right:-30mm;width:130mm;height:110mm;pointer-events:none;
  background:radial-gradient(closest-side,rgba(198,255,0,.16),transparent 70%)}
.portada > *{position:relative;z-index:1}
.marca{display:flex;align-items:center;gap:4mm;margin-bottom:10mm}
.marca .iso{font-size:22pt}
.marca .iso .br,.marca .iso .slash,.sello .iso .br,.sello .iso .slash{color:var(--lime)}
.marca .iso .bc,.sello .iso .bc{color:var(--cream)}
.marca-txt{font-family:var(--f-mono);font-size:8.5pt;letter-spacing:.2em;text-transform:uppercase;color:var(--cream);
  border-left:.3mm solid rgba(143,158,139,.45);padding-left:4mm;line-height:1.5}
.marca-txt small{display:block;font-size:6.5pt;letter-spacing:.16em;color:var(--muted)}
.eyebrow{font-family:var(--f-mono);font-size:8.5pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--lime);margin-bottom:5mm}
.titulo{font-family:var(--f-display);font-weight:700;font-size:24pt;line-height:1.06;letter-spacing:-.025em;text-wrap:balance}
.regla{width:26mm;height:1.4mm;border-radius:.4mm;background:var(--lime);box-shadow:0 0 6mm rgba(198,255,0,.35);margin:7mm 0 9mm}
.datos{display:grid;grid-template-columns:repeat(2,1fr);gap:5mm 12mm;border-top:.3mm solid rgba(198,255,0,.22);padding-top:5mm}
.dato .k{font-family:var(--f-mono);font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:1.6mm}
.dato .v{font-size:11pt;font-weight:500;color:var(--cream)}

/* cuerpo */
.cuerpo{padding:11mm 18mm 10mm;display:flex;flex-direction:column;gap:6.5mm}
.bloque{display:flex;flex-direction:column;gap:3mm}
h2{font-family:var(--f-display);font-weight:700;font-size:13.5pt;letter-spacing:-.015em;display:flex;align-items:center;gap:3.5mm;break-after:avoid}
h2 .n{font-family:var(--f-mono);font-size:8pt;font-weight:700;letter-spacing:.04em;color:var(--ground);background:var(--lime);border-radius:.8mm;padding:.7mm 1.8mm;line-height:1.2}
p{max-width:62em}
ul{list-style:none;display:flex;flex-direction:column;gap:2.2mm}
li{display:flex;gap:3.6mm;align-items:flex-start;break-inside:avoid}
li::before{content:"";flex:none;width:2.3mm;height:2.3mm;border-radius:.4mm;background:var(--lime);border:.3mm solid var(--ground);margin-top:1.7mm}
li.no::before{background:none;border:.35mm solid var(--muted)}
li b{font-weight:600}

table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th{font-family:var(--f-mono);font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--circuit);text-align:left;
  padding:0 0 3mm;border-bottom:.4mm solid var(--tinta);font-weight:600}
th.num,td.num{text-align:right;white-space:nowrap;padding-left:4mm}
td{padding:3mm 0;border-bottom:.3mm solid var(--linea);vertical-align:top}
tr{break-inside:avoid}
td .desc{font-size:8.6pt;color:var(--gris);margin-top:1mm}
table.junta{break-inside:avoid}
tr.total td{border-bottom:none;padding:0}
.tot{background:var(--ground);border-radius:2mm;padding:4mm 5mm;display:flex;justify-content:space-between;align-items:center}
.tot .rot{font-family:var(--f-mono);font-size:8.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--cream);font-weight:600}
.tot .monto{font-family:var(--f-display);font-weight:700;font-size:16pt;color:var(--lime);letter-spacing:-.01em}
tr.sub td{border-bottom:.4mm solid var(--tinta);font-weight:600}
tr.desc-row td.num{color:var(--circuit);font-weight:600}

.condiciones{background:var(--cream);border-radius:3mm;border-top:1.4mm solid var(--lime);padding:7mm;display:grid;grid-template-columns:repeat(2,1fr);gap:5mm 9mm}
.cond{break-inside:avoid}
.cond .k{font-family:var(--f-mono);font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--circuit);margin-bottom:1.4mm;font-weight:600}
.cond .v{font-size:9.3pt;line-height:1.42}

.precio-abono{font-family:var(--f-display);font-weight:700;font-size:16pt;letter-spacing:-.01em}
.precio-abono small{font-family:var(--f-mono);font-size:7.5pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--circuit);margin-left:2mm}

.final{break-inside:avoid;gap:5mm}
.cierre{background:var(--ground);color:var(--cream);border-radius:3mm;padding:7mm 8mm;display:flex;justify-content:space-between;
  align-items:center;gap:8mm;position:relative;overflow:hidden}
.cierre::before{content:"";position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(198,255,0,.06) .25mm,transparent .25mm),linear-gradient(90deg,rgba(198,255,0,.06) .25mm,transparent .25mm);background-size:7mm 7mm}
.cierre > *{position:relative}
.cierre .txt{max-width:112mm}
.cierre h3{font-family:var(--f-display);font-weight:700;font-size:15pt;color:var(--lime);margin-bottom:2mm;letter-spacing:-.01em}
.cierre p{font-size:9.4pt;color:#cfd5c9}
.sello .iso{font-size:24pt}
.firmas{display:grid;grid-template-columns:1fr 1fr;gap:12mm}
.firma{border-bottom:.35mm solid var(--tinta);height:20mm}
.firmas .rot{font-family:var(--f-mono);font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:var(--gris);margin-top:1.6mm}
.nota{font-size:8.7pt;color:var(--gris)}
.pie-pantalla{margin-top:4mm;padding-top:4mm;border-top:.3mm solid var(--linea);font-family:var(--f-mono);font-size:7pt;letter-spacing:.08em;color:var(--gris)}

@media (max-width:820px){.doc{margin:0;box-shadow:none}.cuerpo,.portada{padding-left:6vw;padding-right:6vw}.barra-txt span{display:none}}

@media print{
  html,body{background:#fff}
  .barra,.pie-pantalla{display:none}
  .doc{width:auto;margin:0;box-shadow:none;overflow:visible}
  .cuerpo{padding:9mm 18mm 0}
}
@page{size:A4;margin:14mm 0 15mm;
  @bottom-left{content:"${CONTACTO}";font-family:'JetBrains Mono',monospace;font-size:6.6pt;letter-spacing:.08em;color:#55605A;padding-left:18mm}
  @bottom-right{content:counter(page, decimal-leading-zero) " / " counter(pages, decimal-leading-zero);font-family:'JetBrains Mono',monospace;
    font-size:6.8pt;font-weight:700;color:#121412;padding-right:18mm}
}
@page :first{margin-top:0}
`;
