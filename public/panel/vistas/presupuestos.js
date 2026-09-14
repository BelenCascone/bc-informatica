// Presupuestos (en la pestaña Precios): tabla, filtro, el modal con todo lo que lee el cliente y el PDF.
// Las plantillas de texto y el documento con la marca están en /panel/presupuesto-doc.js.
import { supabase } from "/panel/conexion.js";
import { state, loadAll, borrar } from "/panel/estado.js";
import { money, dateFmt, hoyISO, sumarDias, esc, fmtPct, num, opciones } from "/panel/formato.js";
import { CATEGORIAS_PRECIO, REFS, rangoEnPesos, fmtRango, tarifaHora, porHora } from "/panel/calculos.js";
import { buildModal, closeModal, toast } from "/panel/ui.js";
import { plantilla, pendientes, calcularTotales, documentoHTML } from "/panel/presupuesto-doc.js";

const ESTADOS_PRESU = ["borrador", "enviado", "aceptado", "rechazado"];

// La dibuja vistas/precios.js junto con el resto de la pestaña.
export function renderPresupuestos() {
  const filtro = document.getElementById("filtro-estado-presu").value;
  const list = state.quotes.filter((q) => !filtro || q.status === filtro);
  const tarifa = tarifaHora();
  document.getElementById("tabla-presupuestos").innerHTML = list
    .map((q) => {
      const ph = porHora(q);
      const phCls = ph && tarifa ? (ph >= tarifa ? "ok" : "bajo") : "";
      return `<tr>
      <td class="mono">${dateFmt(q.date)}</td>
      <td>${esc(q.title)}<div class="dim" style="font-size:12px">${q.doc?.numero ? `Nº ${esc(q.doc.numero)} · ` : ""}${CATEGORIAS_PRECIO[q.category] || ""}${q.publishable ? " · caso para la landing" : ""}</div></td>
      <td class="dim">${esc(q.client_name) || "—"}</td>
      <td class="mono">${money(q.final_price)}${Number(q.list_price) > Number(q.final_price) ? `<div class="dim" style="font-size:11.5px">lista ${money(q.list_price)}</div>` : ""}</td>
      <td>${ph ? `<span class="pill ${phCls}">${money(ph)}/h</span>` : '<span class="dim">—</span>'}</td>
      <td><span class="badge ${q.status}">${q.status}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-pdf-presu="${q.id}">PDF</button>
        <button class="icon-btn" data-edit-presu="${q.id}">Ver / editar</button>
        <button class="icon-btn danger" data-del-presu="${q.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-presupuestos").hidden = list.length > 0 || !state.preciosOk;
  document.getElementById("presu-doc-setup").hidden = state.docOk || !state.preciosOk;
}

document.getElementById("filtro-estado-presu").addEventListener("change", renderPresupuestos);
document.getElementById("btn-nuevo-presu").addEventListener("click", () => openPresuModal());

document.getElementById("tabla-presupuestos").addEventListener("click", (e) => {
  const { editPresu, delPresu, pdfPresu } = e.target.dataset;
  if (editPresu) openPresuModal(state.quotes.find((q) => q.id === editPresu));
  if (pdfPresu) {
    const q = state.quotes.find((x) => x.id === pdfPresu);
    abrirDocumento(q, docDe(q));
  }
  if (delPresu) borrar("quotes", delPresu, "¿Borrar este presupuesto?", "Presupuesto borrado.");
});

// Nº correlativo por año: 2026-001, 2026-002…
function siguienteNumero(fecha) {
  const anio = (fecha || hoyISO()).slice(0, 4);
  const usados = state.quotes
    .map((q) => q.doc?.numero)
    .filter((n) => n?.startsWith(anio + "-"))
    .map((n) => parseInt(n.slice(5), 10) || 0);
  const delAnio = state.quotes.filter((q) => q.date?.startsWith(anio)).length;
  return `${anio}-${String(Math.max(delAnio, ...usados) + 1).padStart(3, "0")}`;
}

// El contenido del documento de un presupuesto. Los que se cargaron antes de que existiera el PDF
// arrancan con la plantilla de su categoría y un renglón con el precio que tenían.
function docDe(q) {
  if (q?.doc) return { items: [], ...q.doc };
  const cat = q?.category || "service";
  const t = plantilla(cat);
  const fecha = q?.date || hoyISO();
  const doc = {
    numero: siguienteNumero(fecha),
    valida_hasta: sumarDias(fecha, t.validez_dias),
    situacion: "",
    propuesta_intro: t.propuesta_intro,
    no_incluye: t.no_incluye,
    plazos: t.plazos,
    condiciones: t.condiciones,
    cierre: t.cierre,
    abono_monto: null,
    abono_incluye: t.abono_incluye,
    descuento_tipo: "pct",
    descuento: 0,
    descuento_motivo: "",
    items: [],
  };
  if (q) {
    const lista = Number(q.list_price) || Number(q.final_price) || 0;
    doc.items = [{ concepto: q.title, detalle: "", cant: 1, precio: lista }];
    if (lista > Number(q.final_price)) Object.assign(doc, { descuento_tipo: "monto", descuento: lista - Number(q.final_price) });
  }
  return doc;
}

function abrirDocumento(q, doc, ventana = window.open("", "_blank")) {
  if (!ventana) return toast("El navegador bloqueó la pestaña nueva: permití las ventanas emergentes para este sitio.");
  ventana.document.open();
  ventana.document.write(documentoHTML(q, doc));
  ventana.document.close();
}

const faltaColumnaDoc = (err) => err && (err.code === "PGRST204" || (/'doc'/.test(err.message) && /column/i.test(err.message)));

function openPresuModal(q) {
  const isEdit = !!q;
  const doc = docDe(q);
  const includes = isEdit ? q.includes || "" : plantilla(q?.category || "service").includes;
  const presu = (k) => esc(doc[k] ?? "");
  const opcionesLista = Object.entries(CATEGORIAS_PRECIO)
    .map(([cat, nombre]) => {
      const items = state.priceItems.filter((p) => p.category === cat);
      return items.length
        ? `<optgroup label="${nombre}">${items.map((p) => `<option value="${p.id}">${esc(p.name)} · ${money(p.price)} por ${esc(p.unit)}</option>`).join("")}</optgroup>`
        : "";
    })
    .join("");

  const modal = buildModal(`
    <h3>${isEdit ? "Presupuesto" : "Nuevo presupuesto"}</h3>
    <form id="presu-form" novalidate>
      <p class="form-sec">// Datos</p>
      <div class="field"><label>Trabajo (es el título del PDF)</label><input name="title" required value="${esc(q?.title)}" placeholder="Ej.: Notebook Lenovo: SSD + RAM + Windows"></div>
      <div class="field-row">
        <div class="field"><label>Cliente</label><input name="client_name" value="${esc(q?.client_name)}"></div>
        <div class="field"><label>Categoría</label>
          <select name="category">${opciones(Object.keys(CATEGORIAS_PRECIO), q?.category || "service", (k) => CATEGORIAS_PRECIO[k])}</select></div>
      </div>
      <div class="field-row field-row--4">
        <div class="field"><label>Nº</label><input name="d_numero" value="${presu("numero")}"></div>
        <div class="field"><label>Fecha</label><input type="date" name="date" required value="${q?.date || hoyISO()}"></div>
        <div class="field"><label>Válido hasta</label><input type="date" name="d_valida_hasta" value="${presu("valida_hasta")}"></div>
        <div class="field"><label>Estado</label><select name="status">${opciones(ESTADOS_PRESU, q?.status || "borrador")}</select></div>
      </div>
      <div class="field"><label>Proyecto (opcional)</label>
        <select name="project_id"><option value="">—</option>
          ${state.projects.map((p) => `<option value="${p.id}" ${q?.project_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}
        </select></div>

      <p class="form-sec">// Lo que lee el cliente</p>
      <p class="form-ayuda">Viene cargado según la categoría: cambiá lo que haga falta. En las listas va una cosa por renglón;
      si escribís <b>Título: detalle</b>, el título sale en negrita. Lo que está entre [corchetes] es para completar.
      Las secciones que dejes vacías no salen en el PDF.</p>
      <div class="field"><label>Qué me contaste</label><textarea name="d_situacion" rows="3" placeholder="El problema contado como te lo contó el cliente.">${presu("situacion")}</textarea></div>
      <div class="field"><label>Qué te propongo · introducción</label><input name="d_propuesta_intro" value="${presu("propuesta_intro")}"></div>
      <div class="field"><label>Qué te propongo · qué incluye</label><textarea name="includes" rows="5">${esc(includes)}</textarea></div>
      <div class="field"><label>Qué no incluye</label><textarea name="d_no_incluye" rows="3">${presu("no_incluye")}</textarea></div>
      <div class="field"><label>Plazos (Etapa: cuándo)</label><textarea name="d_plazos" rows="2">${presu("plazos")}</textarea></div>

      <p class="form-sec">// Precio</p>
      <div class="items" id="presu-items"></div>
      <div class="items-add">
        <select id="presu-agregar"><option value="">+ Agregar de tu lista de precios…</option>${opcionesLista}</select>
        <button type="button" class="btn btn--ghost" id="presu-renglon">+ Renglón en blanco</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Descuento</label>
          <div class="descuento">
            <input type="number" step="any" min="0" name="d_descuento" value="${doc.descuento || ""}" placeholder="0">
            <select name="d_descuento_tipo" aria-label="Tipo de descuento">${opciones(["pct", "monto"], doc.descuento_tipo || "pct", (v) => (v === "pct" ? "%" : "$"))}</select>
          </div></div>
        <div class="field"><label>Motivo del descuento</label><input name="d_descuento_motivo" value="${presu("descuento_motivo")}" placeholder="Ej.: por pago de contado"></div>
      </div>
      <div class="totales" id="presu-totales"></div>
      <div class="ref-hint" id="presu-refs"></div>
      <div class="field-row">
        <div class="field"><label>Abono mensual (opcional)</label><input type="number" step="1" min="0" name="d_abono_monto" value="${doc.abono_monto ?? ""}" placeholder="vacío = no lleva abono"></div>
        <div class="field"><label>Qué incluye el abono</label><textarea name="d_abono_incluye" rows="2">${presu("abono_incluye")}</textarea></div>
      </div>

      <p class="form-sec">// Condiciones y cierre</p>
      <div class="field"><label>Condiciones (Título: detalle)</label><textarea name="d_condiciones" rows="4">${presu("condiciones")}</textarea></div>
      <div class="field"><label>Texto del cierre (debajo de “¿Arrancamos?”)</label><textarea name="d_cierre" rows="2">${presu("cierre")}</textarea></div>

      <details class="interno">
        <summary>// Sólo para vos: horas, repuestos y por qué este precio (no sale en el PDF)</summary>
        <div class="field-row">
          <div class="field"><label>Horas estimadas</label><input type="number" step="0.5" min="0" name="hours_estimated" value="${q?.hours_estimated ?? ""}"></div>
          <div class="field"><label>Horas reales</label><input type="number" step="0.5" min="0" name="hours_real" value="${q?.hours_real ?? ""}"></div>
        </div>
        <p class="calc" id="presu-calc"></p>
        <div class="field-row">
          <div class="field"><label>Repuestos (ARS)</label><input type="number" step="1" min="0" name="parts_cost" value="${q?.parts_cost ?? ""}"></div>
          <div class="field"><label>Los repuestos los paga</label>
            <select name="parts_paid_by"><option value="">—</option>${opciones(["cliente", "yo"], q?.parts_paid_by)}</select></div>
        </div>
        <div class="field"><label>Por qué llegué a este precio</label><textarea name="reasoning" rows="3">${esc(q?.reasoning)}</textarea></div>
        <label class="check"><input type="checkbox" name="publishable" ${q?.publishable ? "checked" : ""}> Se puede contar como caso en la landing (sin datos del cliente)</label>
      </details>

      <div class="actions actions--sticky">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--ghost" data-pdf="0">Guardar</button>
        <button type="submit" class="btn btn--primary" data-pdf="1">Guardar y generar PDF</button>
      </div>
    </form>
  `, { wide: "doc" });

  const form = modal.querySelector("#presu-form");
  const itemsEl = modal.querySelector("#presu-items");
  const totalesEl = modal.querySelector("#presu-totales");
  const refsEl = modal.querySelector("#presu-refs");
  const calcEl = modal.querySelector("#presu-calc");
  let items = doc.items.map((it) => ({ ...it }));

  const totales = () => calcularTotales({ items, descuento: num(form.d_descuento.value), descuento_tipo: form.d_descuento_tipo.value });

  const renderItems = () => {
    itemsEl.innerHTML = items.length
      ? items
          .map(
            (it, i) => `<div class="item-row" data-i="${i}">
          <input data-k="concepto" placeholder="Concepto" value="${esc(it.concepto)}">
          <input data-k="detalle" placeholder="Detalle (opcional)" value="${esc(it.detalle)}">
          <input data-k="cant" type="number" step="0.5" min="0" value="${it.cant ?? 1}" title="Cantidad" aria-label="Cantidad">
          <input data-k="precio" type="number" step="1" min="0" value="${it.precio ?? ""}" placeholder="Precio" aria-label="Precio unitario">
          <span class="importe mono">${money((Number(it.cant) || 0) * (Number(it.precio) || 0))}</span>
          <button type="button" class="icon-btn danger" data-quitar="${i}" aria-label="Quitar renglón">✕</button>
        </div>`
          )
          .join("")
      : '<p class="dim items-vacio">Sumá lo que vas a cobrar: elegilo de tu lista de precios o agregá un renglón en blanco.</p>';
  };

  const actualizarTotales = () => {
    const { subtotal, descuento, total } = totales();
    totalesEl.innerHTML =
      (descuento ? `<span>Valor de lista <b>${money(subtotal)}</b></span><span>Descuento <b>− ${money(descuento)}</b></span>` : "") +
      `<span class="total">Total <b>${money(total)}</b></span>`;
  };

  // Mientras cargás: qué cobra el mercado en esa categoría y cuánto te queda la hora.
  const actualizarAyuda = () => {
    const cat = form.category.value;
    const tarifa = tarifaHora();
    const refs = REFS.items.filter((r) => r.categoria === cat);
    const estim = num(form.hours_estimated.value);
    const lineas = refs.slice(0, 6).map((r) => {
      const rango = rangoEnPesos(r);
      return `<li><b>${esc(r.nombre)}</b>: ${rango ? fmtRango(rango) : "—"} <span class="dim">(${esc(r.fuente)}, ${esc(r.zona)})</span></li>`;
    });
    refsEl.innerHTML =
      (tarifa && estim ? `Con ${estim} h a tu tarifa de ${money(tarifa)} serían <b>${money(estim * tarifa)}</b>.<br>` : "") +
      (lineas.length ? `Precios de mercado en ${CATEGORIAS_PRECIO[cat]}:<ul>${lineas.join("")}</ul>` : `Sin precios de mercado cargados para ${CATEGORIAS_PRECIO[cat]}.`);

    const { subtotal, total } = totales();
    const reales = num(form.hours_real.value);
    const partes = [];
    if (subtotal && total < subtotal) partes.push(`descuento ${fmtPct(1 - total / subtotal)}`);
    if (total && reales) partes.push(`<b>${money(total / reales)}</b> por hora real`);
    else if (total && estim) partes.push(`${money(total / estim)} por hora estimada`);
    calcEl.innerHTML = partes.join(" · ");
  };

  itemsEl.addEventListener("input", (e) => {
    const fila = e.target.closest(".item-row");
    if (!fila) return;
    const it = items[fila.dataset.i];
    const k = e.target.dataset.k;
    it[k] = k === "cant" || k === "precio" ? num(e.target.value) : e.target.value;
    fila.querySelector(".importe").textContent = money((Number(it.cant) || 0) * (Number(it.precio) || 0));
    actualizarTotales();
  });
  itemsEl.addEventListener("click", (e) => {
    const i = e.target.dataset.quitar;
    if (i === undefined) return;
    items.splice(Number(i), 1);
    renderItems();
    actualizarTotales();
    actualizarAyuda();
  });
  modal.querySelector("#presu-agregar").addEventListener("change", (e) => {
    const p = state.priceItems.find((x) => x.id === e.target.value);
    e.target.value = "";
    if (!p) return;
    items.push({ concepto: p.name, detalle: "", cant: 1, precio: Number(p.price) });
    renderItems();
    actualizarTotales();
    actualizarAyuda();
  });
  modal.querySelector("#presu-renglon").addEventListener("click", () => {
    items.push({ concepto: "", detalle: "", cant: 1, precio: null });
    renderItems();
    itemsEl.querySelector(".item-row:last-child input").focus();
  });

  // Al cambiar la categoría, los textos que seguían como venían de la plantilla se cambian por los de la nueva.
  let base = plantilla(form.category.value);
  const CAMPOS_PLANTILLA = { d_propuesta_intro: "propuesta_intro", includes: "includes", d_no_incluye: "no_incluye",
    d_plazos: "plazos", d_condiciones: "condiciones", d_abono_incluye: "abono_incluye", d_cierre: "cierre" };
  form.category.addEventListener("change", () => {
    const nueva = plantilla(form.category.value);
    for (const [campo, clave] of Object.entries(CAMPOS_PLANTILLA)) {
      const v = form[campo].value.trim();
      if (!v || v === base[clave].trim()) form[campo].value = nueva[clave];
    }
    const fecha = form.date.value || hoyISO();
    if (!form.d_valida_hasta.value || form.d_valida_hasta.value === sumarDias(fecha, base.validez_dias)) {
      form.d_valida_hasta.value = sumarDias(fecha, nueva.validez_dias);
    }
    base = nueva;
  });
  form.date.addEventListener("change", () => {
    if (!isEdit && form.date.value) form.d_valida_hasta.value = sumarDias(form.date.value, base.validez_dias);
  });

  form.addEventListener("input", () => {
    actualizarTotales();
    actualizarAyuda();
  });
  renderItems();
  actualizarTotales();
  actualizarAyuda();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const conPdf = e.submitter?.dataset.pdf === "1";
    if (!form.elements.title.value.trim()) {
      form.elements.title.focus();
      return toast("Poné el nombre del trabajo.");
    }
    const fd = new FormData(form);
    const p = {};
    const d = {};
    for (const [k, v] of fd.entries()) (k.startsWith("d_") ? d : p)[k.replace(/^d_/, "")] = typeof v === "string" ? v.trim() : v;
    d.items = items
      .filter((it) => String(it.concepto || "").trim() || Number(it.precio))
      .map((it) => ({ concepto: String(it.concepto || "").trim(), detalle: String(it.detalle || "").trim(), cant: num(it.cant) ?? 1, precio: num(it.precio) ?? 0 }));
    if (!d.items.length) return toast("Agregá al menos un renglón en Precio.");
    d.descuento = num(d.descuento) || 0;
    d.abono_monto = num(d.abono_monto);
    const { subtotal, total } = calcularTotales(d);
    p.list_price = subtotal;
    p.final_price = total;
    for (const k of ["parts_cost", "hours_estimated", "hours_real"]) p[k] = num(p[k]);
    for (const k of ["project_id", "parts_paid_by", "client_name", "includes", "reasoning"]) p[k] = p[k] || null;
    p.publishable = fd.get("publishable") === "on";

    let ventana = null;
    if (conPdf) {
      const faltan = pendientes([p.title, p.includes, ...Object.values(d).filter((v) => typeof v === "string"), ...d.items.map((it) => `${it.concepto} ${it.detalle}`)]);
      if (faltan.length && !confirm(`Quedan partes para completar: ${[...new Set(faltan)].join(", ")}.\n\n¿Generar el PDF igual?`)) return;
      // La pestaña se abre ya, antes de guardar: si se abre después, el navegador la toma como emergente y la bloquea.
      ventana = window.open("", "_blank");
    }

    const guardar = (datos) =>
      isEdit ? supabase.from("quotes").update(datos).eq("id", q.id) : supabase.from("quotes").insert(datos);
    let { error } = await guardar({ ...p, doc: d });
    let sinDoc = false;
    if (faltaColumnaDoc(error)) {
      ({ error } = await guardar(p));
      sinDoc = !error;
      state.docOk = false;
    }
    if (error) {
      ventana?.close();
      return toast("Error: " + error.message);
    }
    closeModal();
    toast(sinDoc
      ? "Guardado, pero sin el texto del PDF: falta correr supabase/003-presupuestos-pdf.sql."
      : isEdit ? "Presupuesto actualizado." : "Presupuesto guardado.");
    loadAll();
    if (ventana) abrirDocumento(p, d, ventana);
  });
}
