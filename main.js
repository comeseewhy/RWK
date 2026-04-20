import { renderLauncherShell } from "./ui/launcherShell.js";
import { loadRuntimeData } from "./data/loadRuntimeData.js";
import { createBootOverlay } from "./ui/bootOverlay.js";
import { ensureAppRuntime, getAppRuntime } from "./state/appRuntime.js";
import { getAppMode, setAppMode, subscribeAppMode } from "./state/appMode.js";
import { createWorkspaceController } from "./workspace/controller.js";
import { renderWorkspaceShell } from "./workspace/renderWorkspaceShell.js";

let workspaceController = null;
let bootOverlay = null;
let appRoot = null;

document.addEventListener("DOMContentLoaded", async () => {
  appRoot = ensureAppRoot();

  bootOverlay = createBootOverlay(appRoot);
  subscribeAppMode(() => {
    void renderApp();
  });

  await preloadLauncherRuntime();
  await renderApp();
});

function ensureAppRoot() {
  const root = document.getElementById("rwk-app-root");

  if (!root) {
    throw new Error("RWK app root #rwk-app-root was not found.");
  }

  return root;
}

async function preloadLauncherRuntime() {
  bootOverlay.show({
    title: "Preparing RWK",
    message: "Loading shared operational dataset..."
  });

  try {
    await ensureAppRuntime(() =>
      loadRuntimeData((progress) => {
        bootOverlay.update({
          message: mapProgressToMessage(progress)
        });
      })
    );

    bootOverlay.hide();
  } catch (error) {
    console.error("[RWK] launcher preload failed:", error);
    bootOverlay.showError(error);
  }
}

async function renderApp() {
  const mode = getAppMode();

  if (mode === "launcher") {
    destroyWorkspace();
    await renderLauncher();
    return;
  }

  if (mode === "workspace") {
    await renderWorkspace();
  }
}

async function renderLauncher() {
  appRoot.innerHTML = `
    <div class="app-stage">
      <div id="landing-root"></div>
    </div>
  `;

  await renderLauncherShell("landing-root", {
    runtimeData: getAppRuntime(),
    onOpenWorkspace() {
      setAppMode("workspace");
    }
  });
}

async function renderWorkspace() {
  appRoot.innerHTML = renderWorkspaceShell();

  if (!workspaceController) {
    workspaceController = createWorkspaceController({
      onBack() {
        setAppMode("launcher");
      }
    });
  }

  try {
    await workspaceController.init({
      root: document,
      mapElementId: "map",
      runtimeData: getAppRuntime()
    });
  } catch (error) {
    console.error("[RWK] workspace render failed:", error);
    bootOverlay.showError(error);
  }
}

function destroyWorkspace() {
  if (!workspaceController) {
    return;
  }

  workspaceController.exitWorkspace?.();
  workspaceController = null;
}

function mapProgressToMessage(progress) {
  const map = {
    starting: "Preparing runtime data...",
    boundaries: "Boundaries loaded.",
    origins: "Origins loaded.",
    manifest: "Manifest loaded.",
    events: "Events snapshot loaded.",
    export: "Spatial export loaded.",
    complete: "Runtime is ready."
  };

  return map[progress?.step] || progress?.label || "Working...";
}