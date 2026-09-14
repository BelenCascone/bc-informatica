// Panel privado de BC Informática: el arranque. Cada pestaña vive en su archivo de /panel/vistas/.
import { iniciarSesion } from "/panel/sesion.js";
import { state, loadAll } from "/panel/estado.js";
// Las vistas se dibujan en este orden cada vez que llegan los datos.
import "/panel/vistas/resumen.js";
import "/panel/vistas/proyectos.js";
import "/panel/vistas/movimientos.js";
import { loadMercado } from "/panel/vistas/precios.js";
import "/panel/excel.js";

// ---------- tabs ----------
function showView(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
}
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});
document.addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto]");
  if (goto) showView(goto.dataset.goto);
});

iniciarSesion(() => {
  loadAll();
  if (!state.mercadoCargado) loadMercado();
});
