// Pestaña Movimientos: ingresos y egresos, filtros por tipo y proyecto, alta, edición y borrado.
import { supabase } from "/panel/conexion.js";
import { state, loadAll, alCambiarDatos } from "/panel/estado.js";
import { money, dateFmt, hoyISO } from "/panel/formato.js";
import { buildModal, closeModal, toast } from "/panel/ui.js";

const CATEGORIAS = ["service", "sistemas", "clases", "asesoria", "otros"];

function renderProyectoFiltroOptions() {
  const select = document.getElementById("filtro-proyecto-mov");
  const current = select.value;
  select.innerHTML =
    `<option value="">Todos los proyectos</option>` +
    state.projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  select.value = current;
}

function renderMovimientos() {
  const tipo = document.getElementById("filtro-tipo-mov").value;
  const proyecto = document.getElementById("filtro-proyecto-mov").value;
  const list = state.transactions.filter(
    (t) => (!tipo || t.type === tipo) && (!proyecto || t.project_id === proyecto)
  );
  const body = document.getElementById("tabla-movimientos");
  body.innerHTML = list
    .map((t) => {
      const proyectoNombre = state.projects.find((p) => p.id === t.project_id)?.name || "—";
      return `<tr>
      <td class="mono">${dateFmt(t.date)}</td>
      <td><span class="badge ${t.type}">${t.type}</span></td>
      <td class="dim">${t.category || "—"}</td>
      <td class="dim">${proyectoNombre}</td>
      <td>${t.description || "—"}</td>
      <td class="mono">${money(t.amount)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-mov="${t.id}">Editar</button>
        <button class="icon-btn danger" data-del-mov="${t.id}">Borrar</button>
      </div></td>
    </tr>`;
    })
    .join("");
  document.getElementById("empty-movimientos").hidden = list.length > 0;
}

alCambiarDatos(() => {
  renderMovimientos();
  renderProyectoFiltroOptions();
});

document.getElementById("filtro-tipo-mov").addEventListener("change", renderMovimientos);
document.getElementById("filtro-proyecto-mov").addEventListener("change", renderMovimientos);

document.getElementById("tabla-movimientos").addEventListener("click", (e) => {
  const editId = e.target.dataset.editMov;
  const delId = e.target.dataset.delMov;
  if (editId) openMovModal(state.transactions.find((t) => t.id === editId));
  if (delId) deleteMov(delId);
});

document.getElementById("btn-nuevo-mov").addEventListener("click", () => openMovModal());

function openMovModal(mov) {
  const isEdit = !!mov;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar movimiento" : "Nuevo movimiento"}</h3>
    <form id="mov-form">
      <div class="field-row">
        <div class="field"><label>Tipo</label>
          <select name="type">
            <option value="ingreso" ${mov?.type === "ingreso" ? "selected" : ""}>Ingreso</option>
            <option value="egreso" ${mov?.type === "egreso" ? "selected" : ""}>Egreso</option>
          </select>
        </div>
        <div class="field"><label>Monto (ARS)</label><input type="number" step="0.01" min="0.01" name="amount" required value="${mov?.amount || ""}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Fecha</label><input type="date" name="date" required value="${mov?.date || hoyISO()}"></div>
        <div class="field"><label>Categoría</label>
          <select name="category">
            <option value="">—</option>
            ${CATEGORIAS.map((c) => `<option value="${c}" ${mov?.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field"><label>Proyecto (opcional)</label>
        <select name="project_id">
          <option value="">—</option>
          ${state.projects.map((p) => `<option value="${p.id}" ${mov?.project_id === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Descripción</label><textarea name="description">${mov?.description || ""}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#mov-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    if (!payload.project_id) payload.project_id = null;
    const { error } = isEdit
      ? await supabase.from("transactions").update(payload).eq("id", mov.id)
      : await supabase.from("transactions").insert(payload);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Movimiento actualizado." : "Movimiento creado.");
    loadAll();
  });
}

async function deleteMov(id) {
  if (!confirm("¿Borrar este movimiento?")) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast("Movimiento borrado.");
  loadAll();
}
