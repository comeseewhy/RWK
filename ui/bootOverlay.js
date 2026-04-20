// ui/bootOverlay.js

export function createBootOverlay(root = document.body) {
  const overlay = document.createElement("div");
  overlay.className = "boot-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="boot-overlay__card" role="status" aria-live="polite">
      <div class="boot-overlay__spinner" aria-hidden="true"></div>
      <h2 class="boot-overlay__title">Preparing RWK</h2>
      <p class="boot-overlay__message">Starting…</p>
    </div>
  `;

  root.appendChild(overlay);

  const titleElement = overlay.querySelector(".boot-overlay__title");
  const messageElement = overlay.querySelector(".boot-overlay__message");

  function show({
    title = "Preparing RWK",
    message = "Starting…"
  } = {}) {
    overlay.hidden = false;
    titleElement.textContent = title;
    messageElement.textContent = message;
  }

  function update({
    title,
    message
  } = {}) {
    if (typeof title === "string") {
      titleElement.textContent = title;
    }

    if (typeof message === "string") {
      messageElement.textContent = message;
    }
  }

  function showError(error) {
    overlay.hidden = false;
    titleElement.textContent = "RWK could not start";
    messageElement.textContent =
      error instanceof Error ? error.message : String(error || "Unknown startup error.");
    overlay.classList.add("is-error");
  }

  function hide() {
    overlay.hidden = true;
    overlay.classList.remove("is-error");
  }

  function destroy() {
    overlay.remove();
  }

  return {
    element: overlay,
    show,
    update,
    showError,
    hide,
    destroy
  };
}