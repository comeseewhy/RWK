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