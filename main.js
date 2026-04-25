import { renderLauncherShell } from "./ui/launcherShell.js";
import { loadRuntimeData } from "./data/loadRuntimeData.js";
import { ensureAppRuntime, getAppRuntime } from "./state/appRuntime.js";
import { getAppMode, setAppMode, subscribeAppMode } from "./state/appMode.js";
import { createWorkspaceController } from "./workspace/controller.js";
import { renderWorkspaceShell } from "./workspace/renderWorkspaceShell.js";

let workspaceController = null;
let appRoot = null;
let latestRuntimeProgress = {
  step: "idle",
  label: "Waiting to initialize runtime...",
  percent: 0
};

document.addEventListener("DOMContentLoaded", async () => {
  appRoot = ensureAppRoot();

  subscribeAppMode(() => {
    void renderApp();
  });

  await renderApp();
  await preloadLauncherRuntime();
});

function ensureAppRoot() {
  const root = document.getElementById("rwk-app-root");

  if (!root) {
    throw new Error("RWK app root #rwk-app-root was not found.");
  }

  return root;
}

async function preloadLauncherRuntime() {
  try {
    await ensureAppRuntime(() =>
      loadRuntimeData((progress) => {
        latestRuntimeProgress = normalizeProgress(progress);
        updateRuntimeRail(latestRuntimeProgress);
      })
    );

    latestRuntimeProgress = {
      step: "complete",
      label: "Runtime ready",
      percent: 100,
      summary: getAppRuntime()?.summary || {}
    };

    await renderApp();
  } catch (error) {
    console.error("[RWK] launcher preload failed:", error);
    latestRuntimeProgress = {
      step: "error",
      label: error instanceof Error ? error.message : "Runtime failed to load.",
      percent: 100,
      error
    };
    updateRuntimeRail(latestRuntimeProgress);
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
    runtimeProgress: latestRuntimeProgress,
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
  }
}

function destroyWorkspace() {
  if (!workspaceController) {
    return;
  }

  workspaceController.exitWorkspace?.();
  workspaceController = null;
}

function updateRuntimeRail(progress) {
  const rail = document.getElementById("launcherRuntimeRail");
  const fill = document.getElementById("launcherRuntimeRailFill");
  const label = document.getElementById("launcherRuntimeRailLabel");

  if (!rail || !fill || !label) {
    return;
  }

  rail.classList.toggle("is-ready", progress.step === "complete");
  rail.classList.toggle("is-error", progress.step === "error");
  fill.style.width = `${Math.max(0, Math.min(100, progress.percent || 0))}%`;
  label.textContent = progress.label || "Loading runtime...";
}

function normalizeProgress(progress = {}) {
  return {
    step: progress.step || "loading",
    label: progress.label || mapProgressToMessage(progress),
    percent: Number.isFinite(progress.percent) ? progress.percent : 0,
    summary: progress.summary || null
  };
}

function mapProgressToMessage(progress) {
  const map = {
    starting: "Preparing runtime data...",
    boundaries: "Boundaries loaded.",
    origins: "Origins loaded.",
    manifest: "Manifest loaded.",
    events: "Events snapshot loaded.",
    export: "Spatial export loaded.",
    normalizing: "Indexing runtime...",
    complete: "Runtime is ready."
  };

  return map[progress?.step] || "Working...";
}