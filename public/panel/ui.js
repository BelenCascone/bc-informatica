// Modal y aviso de abajo (toast), compartidos por todas las vistas.

export function buildModal(innerHtml, { wide = false } = {}) {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "active-modal";
  backdrop.innerHTML = `<div class="modal${wide === "doc" ? " modal--doc" : wide ? " modal--wide" : ""}">${innerHtml}</div>`;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.dataset.close !== undefined) closeModal();
  });
  document.body.appendChild(backdrop);
  return backdrop;
}
export function closeModal() {
  document.getElementById("active-modal")?.remove();
}
let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
