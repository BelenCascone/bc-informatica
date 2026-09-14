// Pestaña Precios: números de arriba, avisos (también los del Resumen), lista de precios y precios
// de mercado. Los presupuestos, que están en la misma pestaña, viven en vistas/presupuestos.js.
import { supabase } from "/panel/conexion.js";
import { state, loadAll, alCambiarDatos, borrar } from "/panel/estado.js";
import { money, dateFmt, hoyISO, esc, fmtPct, redondear, opciones } from "/panel/formato.js";
import {
  CATEGORIAS_PRECIO, REFS, inflacionDesde, mesesDesde, rangoEnPesos, compararConMercado, fmtRango, tarifaHora, porHora,
} from "/panel/calculos.js";
import { buildModal, closeModal, toast } from "/panel/ui.js";
import { renderPresupuestos } from "/panel/vistas/presupuestos.js";

const UNIDADES = ["trabajo", "hora", "mes", "clase", "paquete", "proyecto"];

// Inflación (INDEC, vía ArgentinaDatos) y dólar MEP (DolarAPI). Son APIs públicas con CORS abierto.
// Si alguna no responde, el panel sigue andando: sólo faltan los avisos que dependen de ella.
export async function loadMercado() {
  state.mercadoCargado = true;
  const [ipc, mep] = await Promise.allSettled([
    fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch("https://dolarapi.com/v1/dolares/bolsa").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);
  if (ipc.status === "fulfilled" && Array.isArray(ipc.value)) {
    state.ipc = ipc.value
      .filter((x) => x.fecha && typeof x.valor === "number")
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  if (mep.status === "fulfilled") state.dolarMep = Number(mep.value?.venta) || null;
  renderPrecios();
}

function calcularAvisos() {
  const avisos = [];
  for (const p of state.priceItems) {
    const precio = Number(p.price);
    const meses = mesesDesde(p.updated_on);
    const inf = inflacionDesde(p.updated_on);
    if (meses >= p.adjust_every_months || (inf && inf.acum >= 0.05)) {
      const sugerido = inf && inf.acum > 0 ? redondear(precio * (1 + inf.acum)) : null;
      avisos.push({
        tipo: "subir", orden: 1,
        html: `<b>${esc(p.name)}</b> (${money(precio)}): el último ajuste fue hace ${meses} ${meses === 1 ? "mes" : "meses"}` +
          (inf && inf.meses ? ` y la inflación publicada desde entonces suma ${fmtPct(inf.acum)}.` : ".") +
          (sugerido ? ` Precio sugerido: <b>${money(sugerido)}</b>.` : " Toca revisarlo."),
      });
    }
    const cmp = p.ref_key ? compararConMercado(precio, p.ref_key) : null;
    if (cmp?.estado === "bajo") {
      avisos.push({
        tipo: "bajo", orden: 0,
        html: `<b>${esc(p.name)}</b> (${money(precio)}) está ${fmtPct(cmp.dif)} debajo del mínimo del mercado ` +
          `(${money(cmp.rango.min)} · ${esc(cmp.ref.fuente)}, ${esc(cmp.ref.zona)}). Podés subirlo sin salirte del rango.`,
      });
    } else if (cmp?.estado === "alto") {
      avisos.push({
        tipo: "alto", orden: 2,
        html: `<b>${esc(p.name)}</b> (${money(precio)}) está ${fmtPct(cmp.dif)} arriba del máximo del mercado ` +
          `(${money(cmp.rango.max)} · ${esc(cmp.ref.fuente)}, ${esc(cmp.ref.zona)}). Si te rechazan presupuestos, empezá por acá.`,
      });
    }
  }

  const tarifa = tarifaHora();
  for (const q of state.quotes) {
    if (q.status === "rechazado") continue;
    const ph = porHora(q);
    if (tarifa && ph !== null && ph < tarifa) {
      avisos.push({
        tipo: "bajo", orden: 0,
        html: `<b>${esc(q.title)}</b> te quedó a <b>${money(ph)} la hora</b> (${money(q.final_price)} en ${q.hours_real} h), ` +
          `debajo de tu tarifa de ${money(tarifa)}.`,
      });
    }
    if (q.status === "aceptado" && Number(q.list_price) > 0 && Number(q.final_price) < Number(q.list_price) * 0.85) {
      const dto = 1 - Number(q.final_price) / Number(q.list_price);
      avisos.push({
        tipo: "bajo", orden: 1,
        html: `<b>${esc(q.title)}</b>: cobraste ${money(q.final_price)}, ${fmtPct(dto)} menos que tu precio de lista (${money(q.list_price)}).`,
      });
    }
  }

  // Lo que dicen los clientes: muchos rechazos → caro; todo aceptado → probablemente barato.
  const limite = new Date();
  limite.setDate(limite.getDate() - 120);
  for (const [cat, nombre] of Object.entries(CATEGORIAS_PRECIO)) {
    const cerrados = state.quotes.filter(
      (q) => q.category === cat && new Date(q.date + "T00:00:00") >= limite && (q.status === "aceptado" || q.status === "rechazado")
    );
    const rech = cerrados.filter((q) => q.status === "rechazado").length;
    const acep = cerrados.length - rech;
    if (rech >= 2 && rech >= acep) {
      avisos.push({ tipo: "alto", orden: 1, html: `En <b>${nombre}</b> te rechazaron ${rech} de ${cerrados.length} presupuestos en los últimos 4 meses. Puede que el precio esté alto para tu público.` });
    } else if (acep >= 4 && rech === 0) {
      avisos.push({ tipo: "subir", orden: 2, html: `En <b>${nombre}</b> te aceptaron los últimos ${acep} presupuestos sin ningún rechazo. Probablemente tengas margen para subir.` });
    }
  }
  return avisos.sort((a, b) => a.orden - b.orden);
}

const ICONO_AVISO = { subir: "Ajustar", bajo: "Bajo", alto: "Alto", ok: "OK" };
const avisoHtml = (a) => `<li class="aviso ${a.tipo}"><span class="ico">${ICONO_AVISO[a.tipo]}</span><span class="txt">${a.html}</span></li>`;

function renderPrecios() {
  document.getElementById("precios-setup").hidden = state.preciosOk;
  const avisos = state.preciosOk ? calcularAvisos() : [];

  const count = document.getElementById("avisos-count");
  count.textContent = avisos.length;
  count.hidden = avisos.length === 0;
  document.getElementById("lista-avisos").innerHTML = avisos.map(avisoHtml).join("");
  document.getElementById("empty-avisos").hidden = avisos.length > 0 || !state.preciosOk;
  document.getElementById("resumen-avisos").hidden = avisos.length === 0;
  document.getElementById("lista-avisos-resumen").innerHTML = avisos.slice(0, 3).map(avisoHtml).join("");

  renderKpisPrecios();
  renderPresupuestos();
  renderListaPrecios();
  renderReferencias();
}
alCambiarDatos(renderPrecios);

function renderKpisPrecios() {
  const tarifa = tarifaHora();
  document.getElementById("kpi-tarifa").textContent = tarifa ? money(tarifa) : "—";
  document.getElementById("kpi-tarifa-sub").textContent = tarifa ? "de tu lista de precios" : "cargá un precio por hora en Sistemas";

  const conHoras = state.quotes.filter((q) => q.status !== "rechazado" && Number(q.hours_real) > 0);
  const horas = conHoras.reduce((s, q) => s + Number(q.hours_real), 0);
  const cobrado = conHoras.reduce((s, q) => s + Number(q.final_price), 0);
  const real = horas ? cobrado / horas : null;
  const elReal = document.getElementById("kpi-hora-real");
  elReal.textContent = real ? money(real) : "—";
  elReal.className = "val" + (real && tarifa ? (real >= tarifa ? " pos" : " neg") : "");
  document.getElementById("kpi-hora-real-sub").textContent = conHoras.length
    ? `${conHoras.length} ${conHoras.length === 1 ? "presupuesto" : "presupuestos"} · ${horas} h`
    : "cargá las horas en tus presupuestos";

  const aceptados = state.quotes.filter((q) => q.status === "aceptado");
  const enCurso = state.quotes.filter((q) => q.status === "borrador" || q.status === "enviado");
  document.getElementById("kpi-aceptado").textContent = money(aceptados.reduce((s, q) => s + Number(q.final_price), 0));
  document.getElementById("kpi-aceptado-sub").textContent =
    `${aceptados.length} aceptados · ${enCurso.length} en curso (${money(enCurso.reduce((s, q) => s + Number(q.final_price), 0))})`;

  const ultimo = state.ipc[state.ipc.length - 1];
  document.getElementById("kpi-ipc").textContent = ultimo ? `${String(ultimo.valor).replace(".", ",")}%` : "—";
  const mes = ultimo ? new Date(ultimo.fecha + "T00:00:00").toLocaleDateString("es-AR", { month: "long" }) : null;
  document.getElementById("kpi-dolar").textContent =
    (mes ? `inflación de ${mes}` : state.mercadoCargado ? "sin datos de inflación" : "cargando…") +
    (state.dolarMep ? ` · MEP ${money(state.dolarMep)}` : "");
}

function renderListaPrecios() {
  const sel = document.getElementById("filtro-cat-precio");
  if (sel.options.length === 1) {
    sel.insertAdjacentHTML("beforeend", Object.entries(CATEGORIAS_PRECIO).map(([k, v]) => `<option value="${k}">${v}</option>`).join(""));
  }
  const list = state.priceItems.filter((p) => !sel.value || p.category === sel.value);
  document.getElementById("tabla-precios").innerHTML = list
    .map((p) => {
      const precio = Number(p.price);
      const meses = mesesDesde(p.updated_on);
      const inf = inflacionDesde(p.updated_on);
      const toca = meses >= p.adjust_every_months || (inf && inf.acum >= 0.05);
      const sugerido = inf && inf.acum > 0 ? redondear(precio * (1 + inf.acum)) : null;
      const infTxt = !inf
        ? '<span class="dim">—</span>'
        : `<span class="pill ${toca ? "subir" : ""}">${fmtPct(inf.acum)}</span>${sugerido && toca ? `<div class="dim" style="font-size:11.5px">sugerido ${money(sugerido)}</div>` : ""}`;
      const cmp = p.ref_key ? compararConMercado(precio, p.ref_key) : null;
      const cmpTxt = !cmp
        ? '<span class="dim">—</span>'
        : !cmp.rango
          ? '<span class="dim">falta el dólar</span>'
          : `<span class="pill ${cmp.estado}">${{ ok: "en rango", bajo: `${fmtPct(cmp.dif)} abajo`, alto: `${fmtPct(cmp.dif)} arriba` }[cmp.estado]}</span><div class="dim" style="font-size:11.5px">${fmtRango(cmp.rango)}</div>`;
      return `<tr>
      <td>${esc(p.name)}<div class="dim" style="font-size:12px">${CATEGORIAS_PRECIO[p.category] || ""}${p.notes ? " · " + esc(p.notes) : ""}</div></td>
      <td class="mono">${money(precio)}<div class="dim" style="font-size:11.5px">por ${esc(p.unit)}</div></td>
      <td class="mono">${dateFmt(p.updated_on)}<div class="dim" style="font-size:11.5px">${meses === 0 ? "este mes" : `hace ${meses} ${meses === 1 ? "mes" : "meses"}`}</div></td>
      <td>${infTxt}</td>
      <td>${cmpTxt}</td>
      <td><div class="row-actions">
        ${sugerido && toca ? `<button class="icon-btn" data-ajustar-precio="${p.id}" data-sugerido="${sugerido}">Aplicar ${money(sugerido)}</button>` : ""}
        <button class="icon-btn" data-edit-precio="${p.id}">Editar</button>
        <button class="icon-btn danger" data-del-precio="${p.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-precios").hidden = list.length > 0 || !state.preciosOk;
}

function renderReferencias() {
  document.getElementById("ref-revisado").textContent = REFS.revisado ? `revisado el ${dateFmt(REFS.revisado)}` : "";
  document.getElementById("tabla-referencias").innerHTML = REFS.items
    .map((r) => {
      const rango = rangoEnPesos(r);
      const usd = r.usdMin != null ? ` <span class="dim">(USD ${r.usdMin}–${r.usdMax})</span>` : "";
      return `<tr>
      <td>${esc(r.nombre)}<div class="dim" style="font-size:12px">${CATEGORIAS_PRECIO[r.categoria] || ""}${r.nota ? " · " + esc(r.nota) : ""}</div></td>
      <td class="mono">${rango ? fmtRango(rango) : "—"}${usd}<div class="dim" style="font-size:11.5px">por ${esc(r.unidad)}</div></td>
      <td class="dim">${esc(r.zona)}</td>
      <td class="src"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.fuente)}</a><div class="dim" style="font-size:11.5px">${esc(r.fecha)}</div></td>
    </tr>`;
    })
    .join("");
}

document.getElementById("filtro-cat-precio").addEventListener("change", renderListaPrecios);
document.getElementById("btn-nuevo-precio").addEventListener("click", () => openPrecioModal());

document.getElementById("tabla-precios").addEventListener("click", async (e) => {
  const { editPrecio, delPrecio, ajustarPrecio, sugerido } = e.target.dataset;
  if (editPrecio) openPrecioModal(state.priceItems.find((p) => p.id === editPrecio));
  if (delPrecio) borrar("price_items", delPrecio, "¿Borrar este precio de la lista?", "Precio borrado.");
  if (ajustarPrecio) {
    if (!confirm(`¿Pasar este precio a ${money(sugerido)} desde hoy?`)) return;
    const { error } = await supabase.from("price_items").update({ price: Number(sugerido), updated_on: hoyISO() }).eq("id", ajustarPrecio);
    if (error) return toast("Error: " + error.message);
    toast("Precio actualizado.");
    loadAll();
  }
});

function openPrecioModal(item) {
  const isEdit = !!item;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar precio" : "Nuevo precio"}</h3>
    <form id="precio-form">
      <div class="field"><label>Servicio</label><input name="name" required value="${esc(item?.name)}"></div>
      <div class="field-row">
        <div class="field"><label>Categoría</label>
          <select name="category">${opciones(Object.keys(CATEGORIAS_PRECIO), item?.category || "service", (k) => CATEGORIAS_PRECIO[k])}</select></div>
        <div class="field"><label>Por</label><select name="unit">${opciones(UNIDADES, item?.unit || "trabajo")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Precio (ARS)</label><input type="number" step="1" min="0" name="price" required value="${item?.price ?? ""}"></div>
        <div class="field"><label>Último ajuste</label><input type="date" name="updated_on" required value="${item?.updated_on || hoyISO()}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Revisar cada (meses)</label><input type="number" min="1" max="24" name="adjust_every_months" value="${item?.adjust_every_months ?? 3}"></div>
        <div class="field"><label>Comparar con</label>
          <select name="ref_key"><option value="">— sin comparar —</option>
            ${REFS.items.map((r) => `<option value="${r.clave}" ${item?.ref_key === r.clave ? "selected" : ""}>${esc(r.nombre)} (${esc(r.zona)})</option>`).join("")}
          </select></div>
      </div>
      <div class="field"><label>Notas</label><textarea name="notes">${esc(item?.notes)}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#precio-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = Object.fromEntries(new FormData(e.target).entries());
    p.price = Number(p.price);
    p.adjust_every_months = Number(p.adjust_every_months) || 3;
    p.ref_key = p.ref_key || null;
    p.notes = p.notes || null;
    // Si cambió el monto y no tocaste la fecha, el ajuste cuenta desde hoy.
    if (isEdit && p.price !== Number(item.price) && p.updated_on === item.updated_on) p.updated_on = hoyISO();
    const { error } = isEdit
      ? await supabase.from("price_items").update(p).eq("id", item.id)
      : await supabase.from("price_items").insert(p);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Precio actualizado." : "Precio agregado.");
    loadAll();
  });
}
