// Pestaña Proyectos: lista, filtro por estado, alta, edición y borrado.
import { supabase } from "/panel/conexion.js";
import { state, loadAll, alCambiarDatos } from "/panel/estado.js";
import { dateFmt } from "/panel/formato.js";
import { buildModal, closeModal, toast } from "/panel/ui.js";

function renderProyectos() {
  const filtro = document.getElementById("filtro-estado-proyecto").value;
  const list = state.projects.filter((p) => !filtro || p.status === filtro);
  const body = document.getElementById("tabla-proyectos");
  body.innerHTML = list
    .map(
      (p) => `<tr>
      <td>${p.name}</td>
      <td class="dim">${p.client_name || "—"}</td>
      <td><span class="badge ${p.status}">${p.status}</span></td>
      <td class="mono">${dateFmt(p.start_date)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-edit-project="${p.id}">Editar</button>
        <button class="icon-btn danger" data-del-project="${p.id}">Borrar</button>
      </div></td>
    </tr>`
    )
    .join("");
  document.getElementById("empty-proyectos").hidden = list.length > 0;
}
alCambiarDatos(renderProyectos);

document.getElementById("filtro-estado-proyecto").addEventListener("change", renderProyectos);

document.getElementById("tabla-proyectos").addEventListener("click", (e) => {
  const editId = e.target.dataset.editProject;
  const delId = e.target.dataset.delProject;
  if (editId) openProjectModal(state.projects.find((p) => p.id === editId));
  if (delId) deleteProject(delId);
});

document.getElementById("btn-nuevo-proyecto").addEventListener("click", () => openProjectModal());

function openProjectModal(project) {
  const isEdit = !!project;
  const modal = buildModal(`
    <h3>${isEdit ? "Editar proyecto" : "Nuevo proyecto"}</h3>
    <form id="project-form">
      <div class="field"><label>Nombre</label><input name="name" required value="${project?.name || ""}"></div>
      <div class="field"><label>Cliente</label><input name="client_name" value="${project?.client_name || ""}"></div>
      <div class="field-row">
        <div class="field"><label>Estado</label>
          <select name="status">
            ${["activo", "pausado", "finalizado"].map((s) => `<option value="${s}" ${project?.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Inicio</label><input type="date" name="start_date" value="${project?.start_date || ""}"></div>
      </div>
      <div class="field"><label>Descripción</label><textarea name="description">${project?.description || ""}</textarea></div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  `);
  modal.querySelector("#project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    const { error } = isEdit
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    if (error) return toast("Error: " + error.message);
    closeModal();
    toast(isEdit ? "Proyecto actualizado." : "Proyecto creado.");
    loadAll();
  });
}

async function deleteProject(id) {
  if (!confirm("¿Borrar este proyecto? Los movimientos asociados quedan sin proyecto.")) return;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return toast("Error: " + error.message);
  toast("Proyecto borrado.");
  loadAll();
}
