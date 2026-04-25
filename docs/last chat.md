Okay, the updated builder looks really great. You can build the time frame. It's really seamless. It's helpful. I appreciate it. So I'm attaching the project export now. Now is the time to work on the runtime block. It's not needed. So the map needs to load. Everything needs to load seamlessly. However, this block is not a visually appealing or necessary way to load the site. Instead, I think it would be really helpful to make the runtime launcher, like the initialization of this website, visually appealing, really interesting. I'm thinking just like a colored sidebar that goes across the top of the screen that is its own independent object separate from the blocks, because currently we have four blocks. We have the opening RWK block, the runtime block, the map block, the builder block. It would be really great if the launcher was removed as a block entirely and rather it was more of like a sequential status bar that loads and provides sort of like a visual cue as to the progress. For loading the site. So, as we know the current functionality, it doesn't allow us to view the map if the runtime has not been loaded, which is obviously necessary. Um, but, and that, that should persist for sure. However, it would be really cool if, rather than having a runtime block with all of this information, if we just had a loading bar at the top of the page, and the loading bar itself was, you know, gray or non-vibrant in color, and slowly, you know, smoothly, but incrementally, incrementally, like loads the site. It gives like a visual cue as to how progress is going for the runtime initializing. And then once it's initialized, the whole bar is blue, and then the relevant contents are stored, you know, uh subtly within that bar. And then the remainder, the remainder of the blocks are operational. I hope that makes sense. Uh, it would be, it would, honestly, the amount of information in this captured, I will make sure to add it uh to the, um to this conversation, but it's not all necessary. Really, we would just need to know how many, like the export value and or the number, like the number of events, the number of joined events, so like interpreting how many coordinates. are to be entirely captured and then last updated. That's really all we need. So I'm hoping to make it much more visually appealing. I'm open to introducing new files to do so. And I also want to optimize the speed because it still takes quite a long time to initialize the site. And I want to make it as efficient and as quick to load as possible, which should scale with the pace in which the loading bar loads. How do we do this?

---

Runtime

Launcher ready
Shared runtime is loaded. Build a time frame or open the full operational map.

Boundaries
Loaded
Origins
Loaded
Manifest
Loaded
Events
4,479
Export
2,565
Joined
2,565
Coordinate-valid
2,565
Updated
2026-04-25T18:48:46.817Z
Shared runtime is ready.

---

Yes — this is the right next phase. Your export shows the runtime block currently lives in ui/launcherShell.js, while the pre-launch loading overlay is still controlled from main.js through ui/bootOverlay.js; runtime fetching is sequential in data/loadRuntimeData.js, which is one reason initialization feels slower than it needs to.

Intended update

Replace the runtime card with a slim top “runtime rail” that:

loads visually from gray → blue
shows staged progress while runtime initializes
stores only useful summary details once ready: events, joined, coordinate-valid, updated
keeps map access disabled until runtime is ready
speeds load by fetching independent runtime assets in parallel
Replace data/loadRuntimeData.js
// data/loadRuntimeData.js

import { normalizeRuntimeData } from "./parseRuntimeData.js";

export const RUNTIME_DATA_CONFIG = Object.freeze({
  boundariesUrl: "./data/boundaries.geojson",
  originsUrl: "./data/origins.json",
  supabaseBaseUrl:
    "https://avtthmyizixxlkblbzqe.supabase.co/storage/v1/object/public/live-data",
  manifestPath: "meta/manifest.json",
  eventsCsvPath: "csv/events_active_snapshot.csv",
  exportCsvPath: "csv/export_confirmed_verified.csv"
});

const RUNTIME_STEPS = Object.freeze({
  starting: 4,
  boundaries: 18,
  origins: 30,
  manifest: 44,
  events: 64,
  export: 82,
  normalizing: 92,
  complete: 100
});

export async function loadRuntimeData(onProgress = () => {}) {
  const progress = createProgressReporter(onProgress);

  progress("starting", {
    label: "Preparing shared runtime...",
    percent: RUNTIME_STEPS.starting
  });

  const manifestUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.manifestPath);
  const eventsUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.eventsCsvPath);
  const exportUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.exportCsvPath);

  const boundariesPromise = fetchJson(RUNTIME_DATA_CONFIG.boundariesUrl).then((data) => {
    progress("boundaries", {
      label: "Boundaries loaded",
      percent: RUNTIME_STEPS.boundaries,
      count: Array.isArray(data?.features) ? data.features.length : 0
    });
    return data;
  });

  const originsPromise = fetchJson(RUNTIME_DATA_CONFIG.originsUrl).then((data) => {
    progress("origins", {
      label: "Origins loaded",
      percent: RUNTIME_STEPS.origins,
      count: Array.isArray(data) ? data.length : 0
    });
    return data;
  });

  const manifestPromise = fetchJson(manifestUrl).then((data) => {
    progress("manifest", {
      label: "Manifest loaded",
      percent: RUNTIME_STEPS.manifest,
      updatedAt: data?.updated_at || ""
    });
    return data;
  });

  const eventsPromise = fetchText(eventsUrl).then((text) => {
    progress("events", {
      label: "Events snapshot loaded",
      percent: RUNTIME_STEPS.events
    });
    return text;
  });

  const exportPromise = fetchText(exportUrl).then((text) => {
    progress("export", {
      label: "Spatial export loaded",
      percent: RUNTIME_STEPS.export
    });
    return text;
  });

  const [
    boundariesGeojson,
    origins,
    manifest,
    eventsCsvText,
    exportCsvText
  ] = await Promise.all([
    boundariesPromise,
    originsPromise,
    manifestPromise,
    eventsPromise,
    exportPromise
  ]);

  progress("normalizing", {
    label: "Indexing runtime...",
    percent: RUNTIME_STEPS.normalizing
  });

  const runtimeData = normalizeRuntimeData({
    boundariesGeojson,
    origins,
    manifest,
    eventsCsvText,
    exportCsvText
  });

  progress("complete", {
    label: "Runtime ready",
    percent: RUNTIME_STEPS.complete,
    summary: runtimeData.summary
  });

  return runtimeData;
}

function buildAssetUrl(path) {
  return `${RUNTIME_DATA_CONFIG.supabaseBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function fetchJson(url) {
  const response = await fetch(withNoCacheStamp(url), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON (${response.status}) from ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(withNoCacheStamp(url), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch text (${response.status}) from ${url}`);
  }

  return response.text();
}

function withNoCacheStamp(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_ts=${Date.now()}`;
}

function createProgressReporter(onProgress) {
  return (step, detail = {}) => {
    try {
      onProgress({
        step,
        percent: detail.percent ?? RUNTIME_STEPS[step] ?? 0,
        ...detail
      });
    } catch (error) {
      console.warn("[RWK] Progress callback failed:", error);
    }
  };
}
Replace main.js
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
Replace ui/launcherShell.js
// ui/launcherShell.js

import { buildAllActivityPreset } from "../config/presets.js";
import { bindAnalysisBuilder, renderAnalysisBuilder } from "./analysisBuilder.js";
import { clearConfig, setConfig } from "../state/session.js";

export async function renderLauncherShell(rootId = "landing-root", options = {}) {
  const {
    runtimeData = null,
    runtimeProgress = null,
    onOpenWorkspace = null
  } = options;

  const root = document.getElementById(rootId);

  if (!root) {
    throw new Error(`Launcher root #${rootId} not found.`);
  }

  root.innerHTML = buildLauncherMarkup(runtimeData, runtimeProgress);
  bindStaticLauncherEvents(root, { onOpenWorkspace });

  setViewMapDisabled(!runtimeData);

  bindAnalysisBuilder({
    onLaunch(config) {
      launchWithConfig(config, { onOpenWorkspace });
    }
  });
}

function buildLauncherMarkup(runtimeData = null, runtimeProgress = null) {
  const summary = getRuntimeSummary(runtimeData);
  const progress = normalizeRuntimeProgress(runtimeProgress, runtimeData);
  const isReady = Boolean(runtimeData);
  const isError = progress.step === "error";

  return `
    <section class="launcher-shell">
      <aside
        id="launcherRuntimeRail"
        class="launcher-runtime-rail ${isReady ? "is-ready" : ""} ${isError ? "is-error" : ""}"
        aria-label="Runtime initialization status"
      >
        <div class="launcher-runtime-rail__track" aria-hidden="true">
          <span
            id="launcherRuntimeRailFill"
            class="launcher-runtime-rail__fill"
            style="width: ${escapeHtml(String(progress.percent))}%"
          ></span>
        </div>

        <div class="launcher-runtime-rail__content">
          <span class="launcher-runtime-rail__status">
            <span class="launcher-runtime-rail__dot" aria-hidden="true"></span>
            <span id="launcherRuntimeRailLabel">${escapeHtml(progress.label)}</span>
          </span>

          <span class="launcher-runtime-rail__meta">
            ${renderRuntimeRailMeta(summary, isReady)}
          </span>
        </div>
      </aside>

      <header class="launcher-hero">
        <p class="launcher-hero__kicker">RWK</p>
        <h1 class="launcher-hero__title">Operational launcher</h1>
        <p class="launcher-hero__subtitle">
          Enter the workspace with the full map population, or build a time frame first
          and open the map with that subset already isolated.
        </p>
      </header>

      <section class="launcher-entry-card" aria-labelledby="viewMapTitle">
        <div class="launcher-section-heading">
          <p class="launcher-section-heading__eyebrow">Map</p>
          <h2 id="viewMapTitle" class="launcher-section-heading__title">
            View operational map
          </h2>
          <p class="launcher-section-heading__description">
            Open the full current workspace after the shared runtime is ready.
          </p>
        </div>

        <button
          id="viewMapButton"
          class="button button--primary launcher-view-map-button"
          type="button"
          ${isReady ? "" : "disabled"}
        >
          View map
        </button>
      </section>

      ${renderAnalysisBuilder(runtimeData)}
    </section>
  `;
}

function bindStaticLauncherEvents(root, options = {}) {
  const viewMapButton = root.querySelector("#viewMapButton");

  viewMapButton?.addEventListener("click", () => {
    launchWithConfig(buildAllActivityPreset(), options);
  });
}

function launchWithConfig(config, options = {}) {
  try {
    clearConfig();
    setConfig(config);

    if (typeof options.onOpenWorkspace === "function") {
      options.onOpenWorkspace(config);
      return;
    }

    window.location.href = "./workspace.html";
  } catch (error) {
    console.error("[RWK] failed to launch workspace:", error);
  }
}

function setViewMapDisabled(disabled) {
  const button = document.getElementById("viewMapButton");
  if (button) {
    button.disabled = disabled;
  }

  const builderButton = document.getElementById("builderLaunchButton");
  if (builderButton && disabled) {
    builderButton.disabled = true;
  }
}

function renderRuntimeRailMeta(summary, isReady) {
  if (!isReady) {
    return "Map access unlocks when runtime is ready.";
  }

  return [
    `${summary.eventsCount.toLocaleString()} events`,
    `${summary.joinedCount.toLocaleString()} joined`,
    `${summary.candidateCount.toLocaleString()} coordinate-valid`,
    summary.updatedAt ? `updated ${formatRuntimeTimestamp(summary.updatedAt)}` : ""
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
}

function normalizeRuntimeProgress(progress, runtimeData) {
  if (runtimeData) {
    return {
      step: "complete",
      label: "Runtime ready",
      percent: 100
    };
  }

  return {
    step: progress?.step || "starting",
    label: progress?.label || "Initializing runtime...",
    percent: Number.isFinite(progress?.percent) ? progress.percent : 0
  };
}

function getRuntimeSummary(runtimeData) {
  if (!runtimeData || typeof runtimeData !== "object") {
    return {
      eventsCount: 0,
      joinedCount: 0,
      candidateCount: 0,
      updatedAt: ""
    };
  }

  const summary = runtimeData.summary || {};

  return {
    eventsCount: Number.isFinite(summary.eventsCount) ? summary.eventsCount : 0,
    joinedCount: Number.isFinite(summary.joinedCount) ? summary.joinedCount : 0,
    candidateCount: Number.isFinite(summary.candidateCount) ? summary.candidateCount : 0,
    updatedAt: summary.updatedAt || runtimeData.manifest?.updated_at || ""
  };
}

function formatRuntimeTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
Add to styles/04-launcher.css

Place this near the top, before .launcher-hero.

.launcher-runtime-rail {
  position: sticky;
  top: 12px;
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.94);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(14px);
}

.launcher-runtime-rail__track {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 100%);
}

.launcher-runtime-rail__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  border-radius: inherit;
  background:
    linear-gradient(90deg, rgba(29, 78, 216, 0.9), rgba(59, 130, 246, 0.92)),
    linear-gradient(90deg, #dbeafe, #bfdbfe);
  transition: width 420ms ease;
}

.launcher-runtime-rail__content {
  position: relative;
  z-index: 1;
  min-height: 54px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launcher-runtime-rail__status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
  font-size: 0.9rem;
  font-weight: 850;
  color: #0f172a;
}

.launcher-runtime-rail__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.16);
}

.launcher-runtime-rail__meta {
  overflow: hidden;
  text-align: right;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.launcher-runtime-rail.is-ready {
  border-color: rgba(29, 78, 216, 0.25);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__dot {
  background: var(--color-primary);
  box-shadow: 0 0 0 5px rgba(29, 78, 216, 0.14);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__status {
  color: var(--color-primary-strong);
}

.launcher-runtime-rail.is-error {
  border-color: rgba(185, 28, 28, 0.32);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__fill {
  background: linear-gradient(90deg, #991b1b, #dc2626);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 5px rgba(185, 28, 28, 0.14);
}

@media (max-width: 720px) {
  .launcher-runtime-rail {
    border-radius: var(--radius-lg);
  }

  .launcher-runtime-rail__content {
    min-height: 70px;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .launcher-runtime-rail__meta {
    width: 100%;
    text-align: left;
    white-space: normal;
  }
}
Remove from styles/04-launcher.css

Delete or leave unused:

.launcher-status-card
.launcher-status-card__header
.launcher-status-card__eyebrow
.launcher-status-card__title
.launcher-status-card__subtitle
.launcher-status-grid

You can keep them temporarily if you prefer zero-risk CSS cleanup; the markup no longer uses them.

Test sequence
Open index.html.
Confirm the runtime block is gone.
Confirm the top runtime rail fills progressively.
Confirm “View map” is disabled during loading.
Confirm it enables once the rail says Runtime ready.
Confirm the final rail summary shows events, joined, coordinate-valid, and updated timestamp.
Confirm the builder still works and opens filtered map views.

This phase completes the runtime presentation cleanup and improves startup speed by parallelizing the fetches.

---

Add to styles/04-launcher.css Place this near the top, before .launcher-hero. .launcher-runtime-rail { position: sticky; top: 12px; z-index: 20; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 999px; background: rgba(248, 250, 252, 0.94); box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1); backdrop-filter: blur(14px); } .launcher-runtime-rail__track { position: absolute; inset: 0; background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 100%); } .launcher-runtime-rail__fill { position: absolute; inset: 0 auto 0 0; width: 0%; border-radius: inherit; background: linear-gradient(90deg, rgba(29, 78, 216, 0.9), rgba(59, 130, 246, 0.92)), linear-gradient(90deg, #dbeafe, #bfdbfe); transition: width 420ms ease; } .launcher-runtime-rail__content { position: relative; z-index: 1; min-height: 54px; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; } .launcher-runtime-rail__status { display: inline-flex; align-items: center; gap: 10px; min-width: 190px; font-size: 0.9rem; font-weight: 850; color: #0f172a; } .launcher-runtime-rail__dot { width: 10px; height: 10px; border-radius: 999px; background: #94a3b8; box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.16); } .launcher-runtime-rail__meta { overflow: hidden; text-align: right; color: #475569; font-size: 0.84rem; font-weight: 700; line-height: 1.3; white-space: nowrap; text-overflow: ellipsis; } .launcher-runtime-rail.is-ready { border-color: rgba(29, 78, 216, 0.25); } .launcher-runtime-rail.is-ready .launcher-runtime-rail__dot { background: var(--color-primary); box-shadow: 0 0 0 5px rgba(29, 78, 216, 0.14); } .launcher-runtime-rail.is-ready .launcher-runtime-rail__status { color: var(--color-primary-strong); } .launcher-runtime-rail.is-error { border-color: rgba(185, 28, 28, 0.32); } .launcher-runtime-rail.is-error .launcher-runtime-rail__fill { background: linear-gradient(90deg, #991b1b, #dc2626); } .launcher-runtime-rail.is-error .launcher-runtime-rail__dot { background: var(--color-danger); box-shadow: 0 0 0 5px rgba(185, 28, 28, 0.14); } @media (max-width: 720px) { .launcher-runtime-rail { border-radius: var(--radius-lg); } .launcher-runtime-rail__content { min-height: 70px; align-items: flex-start; flex-direction: column; justify-content: center; gap: 6px; } .launcher-runtime-rail__meta { width: 100%; text-align: left; white-space: normal; } } Remove from styles/04-launcher.css Delete or leave unused: .launcher-status-card .launcher-status-card__header .launcher-status-card__eyebrow .launcher-status-card__title .launcher-status-card__subtitle .launcher-status-grid You can keep them temporarily if you prefer zero-risk CSS cleanup; the markup no longer uses them. --- Okay, so I've added all of the files that were comprehensively updated, but I did not update the style files. So I'm wondering, I've attached them again, your recommendations. Can you comprehensively update the associated files into new solutions that retain the existing functionality so that we can continue to develop this idea?

---

Yes. Replace styles/04-launcher.css with this full version. It keeps the launcher/builder styling and adds the runtime rail while removing the old runtime-card dependency. Your active HTML already imports ./styles/index.css, with style.css acting only as a compatibility wrapper.

.launcher-shell {
  width: min(1180px, calc(100% - 28px));
  margin: 0 auto;
  padding: 28px 0 40px;
  display: grid;
  gap: 24px;
}

/* Runtime rail */

.launcher-runtime-rail {
  position: sticky;
  top: 12px;
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.94);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(14px);
}

.launcher-runtime-rail__track {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 100%);
}

.launcher-runtime-rail__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  border-radius: inherit;
  background:
    linear-gradient(90deg, rgba(29, 78, 216, 0.9), rgba(59, 130, 246, 0.92)),
    linear-gradient(90deg, #dbeafe, #bfdbfe);
  transition: width 420ms ease;
}

.launcher-runtime-rail__content {
  position: relative;
  z-index: 1;
  min-height: 54px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launcher-runtime-rail__status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
  font-size: 0.9rem;
  font-weight: 850;
  color: #0f172a;
}

.launcher-runtime-rail__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.16);
}

.launcher-runtime-rail__meta {
  overflow: hidden;
  text-align: right;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.launcher-runtime-rail.is-ready {
  border-color: rgba(29, 78, 216, 0.25);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__dot {
  background: var(--color-primary);
  box-shadow: 0 0 0 5px rgba(29, 78, 216, 0.14);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__status {
  color: var(--color-primary-strong);
}

.launcher-runtime-rail.is-error {
  border-color: rgba(185, 28, 28, 0.32);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__fill {
  background: linear-gradient(90deg, #991b1b, #dc2626);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 5px rgba(185, 28, 28, 0.14);
}

/* Hero */

.launcher-hero {
  padding: 28px;
  border: 1px solid rgba(29, 78, 216, 0.12);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: var(--shadow-soft);
}

.launcher-hero__kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-hero__title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1.05;
}

.launcher-hero__subtitle {
  max-width: 780px;
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--color-muted);
}

/* Cards */

.launcher-entry-card,
.launcher-group,
.launcher-builder {
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.launcher-entry-card {
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at top right, rgba(29, 78, 216, 0.1), transparent 34%),
    var(--color-surface);
}

.launcher-view-map-button {
  width: fit-content;
  min-width: 180px;
  justify-self: start;
  font-weight: 800;
}

.launcher-section-heading__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-section-heading__title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
}

.launcher-section-heading__description {
  margin: 8px 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-feedback {
  margin: 16px 0 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--color-muted);
}

/* Legacy launcher cards retained for compatibility */

.launcher-groups {
  display: grid;
  gap: 22px;
}

.launcher-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.launcher-card {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  min-height: 176px;
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-card--button {
  cursor: pointer;
}

.launcher-card--button:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(29, 78, 216, 0.25);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.launcher-card--button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.launcher-card__body {
  display: grid;
  gap: 10px;
}

.launcher-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.launcher-card__description {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.launcher-card__meta {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: 0.82rem;
  font-weight: 700;
}

/* Builder */

.launcher-builder {
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at top left, rgba(29, 78, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.launcher-builder__tree {
  display: grid;
  gap: 18px;
  margin-top: 2px;
}

.launcher-builder__summary {
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border: 1px solid rgba(29, 78, 216, 0.14);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  color: var(--color-text);
  font-size: 0.92rem;
  line-height: 1.4;
}

.launcher-builder__summary-meta {
  color: var(--color-muted);
  font-size: 0.84rem;
  font-weight: 600;
}

.launcher-builder__empty {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px dashed var(--color-border-strong);
  border-radius: 999px;
  color: var(--color-muted);
  background: var(--color-surface-muted);
  font-size: 0.88rem;
  line-height: 1.35;
}

.launcher-builder__save {
  min-width: 220px;
  font-weight: 800;
}

.launcher-builder__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.launcher-builder__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

/* Fields */

.launcher-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.launcher-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-muted);
}

.launcher-input {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-input::placeholder {
  color: #8a97a6;
}

.launcher-input:hover {
  border-color: var(--color-border-strong);
}

.launcher-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
}

/* Chips */

.launcher-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.launcher-chip-group--tree {
  align-items: stretch;
}

.launcher-chip-group--dates {
  max-height: 220px;
  overflow: auto;
  padding: 2px 2px 4px;
}

.launcher-chip {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.launcher-chip:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
}

.launcher-chip.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.08);
}

.launcher-chip--date-tree {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  font-weight: 700;
}

.launcher-chip__label {
  line-height: 1.1;
}

.launcher-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
}

.launcher-chip.is-active .launcher-chip__count {
  background: #ffffff;
  color: var(--color-primary-strong);
}

/* Responsive */

@media (max-width: 720px) {
  .launcher-shell {
    width: min(100% - 20px, 1180px);
    padding: 18px 0 30px;
    gap: 18px;
  }

  .launcher-runtime-rail {
    top: 8px;
    border-radius: var(--radius-lg);
  }

  .launcher-runtime-rail__content {
    min-height: 70px;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .launcher-runtime-rail__meta {
    width: 100%;
    text-align: left;
    white-space: normal;
  }

  .launcher-hero,
  .launcher-entry-card,
  .launcher-group,
  .launcher-builder {
    padding: 18px;
    border-radius: var(--radius-lg);
  }

  .launcher-builder__grid {
    grid-template-columns: 1fr;
  }

  .launcher-view-map-button,
  .launcher-builder__save {
    width: 100%;
  }
}

Only this style file should be necessary for the runtime-rail visual phase. Test after replacement: launcher rail appears at the top, old runtime block is gone, View Map stays gated until runtime readiness, and the builder remains styled/functional.