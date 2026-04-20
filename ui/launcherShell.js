import { ANALYSIS_PROFILE_GROUPS } from "../config/analysisProfiles.js";
import { resolveConfig } from "../engine/decisionEngine.js";
import { bindAnalysisBuilder, renderAnalysisBuilder } from "./analysisBuilder.js";
import { clearConfig, setConfig } from "../state/session.js";

export async function renderLauncherShell(rootId = "landing-root", options = {}) {
  const {
    runtimeData = null,
    onOpenWorkspace = null
  } = options;

  const root = document.getElementById(rootId);

  if (!root) {
    throw new Error(`Launcher root #${rootId} not found.`);
  }

  root.innerHTML = buildLauncherMarkup();
  bindStaticLauncherEvents(root, { onOpenWorkspace });

  const summary = getRuntimeSummary(runtimeData);
  renderRuntimeSummary(summary);

  if (runtimeData) {
    setLauncherStatus({
      title: "Launcher ready",
      subtitle: "Shared runtime is loaded. Choose a quick start or open a custom analysis."
    });
    disableLaunchButtons(false);
    setProgressText("Shared runtime is ready.");
  } else {
    setLauncherStatus({
      title: "Launcher not ready",
      subtitle: "Runtime is not loaded yet."
    });
    disableLaunchButtons(true);
    setProgressText("Launcher is waiting for shared runtime.");
  }

  bindAnalysisBuilder({
    onLaunch(config) {
      launchWithConfig(config, { onOpenWorkspace });
    }
  });
}

function buildLauncherMarkup() {
  return `
    <section class="launcher-shell">
      <header class="launcher-hero">
        <p class="launcher-hero__kicker">RWK</p>
        <h1 class="launcher-hero__title">Operational launcher</h1>
        <p class="launcher-hero__subtitle">
          Load the shared operational runtime once, then enter the workspace through a compact
          preset or a custom analysis question.
        </p>
      </header>

      <section class="launcher-status-card" aria-labelledby="launcherStatusTitle">
        <div class="launcher-status-card__header">
          <div>
            <p class="launcher-status-card__eyebrow">Runtime</p>
            <h2 id="launcherStatusTitle" class="launcher-status-card__title">
              Preparing launcher
            </h2>
            <p id="launcherStatusSubtitle" class="launcher-status-card__subtitle">
              Initializing...
            </p>
          </div>
        </div>

        <dl class="launcher-status-grid" id="launcherRuntimeSummary">
          <div class="stats-row"><dt>Boundaries</dt><dd>Pending</dd></div>
          <div class="stats-row"><dt>Origins</dt><dd>Pending</dd></div>
          <div class="stats-row"><dt>Manifest</dt><dd>Pending</dd></div>
          <div class="stats-row"><dt>Events</dt><dd>0</dd></div>
          <div class="stats-row"><dt>Export</dt><dd>0</dd></div>
          <div class="stats-row"><dt>Joined</dt><dd>0</dd></div>
          <div class="stats-row"><dt>Coordinate-valid</dt><dd>0</dd></div>
          <div class="stats-row"><dt>Updated</dt><dd>—</dd></div>
        </dl>

        <p id="launcherProgressText" class="launcher-feedback" aria-live="polite">
          Waiting to begin...
        </p>
      </section>

      <section class="launcher-groups">
        ${ANALYSIS_PROFILE_GROUPS.map(renderGroup).join("")}
      </section>

      ${renderAnalysisBuilder()}
    </section>
  `;
}

function renderGroup(group) {
  return `
    <section class="launcher-group" aria-labelledby="group-${group.id}">
      <div class="launcher-section-heading">
        <p class="launcher-section-heading__eyebrow">Quick start</p>
        <h2 id="group-${group.id}" class="launcher-section-heading__title">${group.title}</h2>
        <p class="launcher-section-heading__description">${group.description}</p>
      </div>

      <div class="launcher-card-grid">
        ${group.items.map(renderGroupItem).join("")}
      </div>
    </section>
  `;
}

function renderGroupItem(item) {
  return `
    <button
      class="launcher-card launcher-card--button"
      type="button"
      data-selection-path="${item.selectionPath}"
      disabled
    >
      <span class="launcher-card__body">
        <span class="launcher-card__title">${item.label}</span>
        <span class="launcher-card__description">${item.description}</span>
      </span>
      <span class="launcher-card__footer">
        <span class="launcher-card__meta">Open workspace</span>
      </span>
    </button>
  `;
}

function bindStaticLauncherEvents(root, options = {}) {
  const buttons = [...root.querySelectorAll("[data-selection-path]")];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectionPath = button.dataset.selectionPath;
      const config = resolveConfig(selectionPath);

      if (!config) {
        setProgressText(`No config could be resolved for ${selectionPath}.`);
        return;
      }

      launchWithConfig(config, options);
    });
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
    setProgressText(`Could not open workspace: ${error.message}`);
  }
}

function disableLaunchButtons(disabled) {
  document.querySelectorAll("[data-selection-path]").forEach((button) => {
    button.disabled = disabled;
  });
}

function setProgressText(text) {
  const element = document.getElementById("launcherProgressText");
  if (element) {
    element.textContent = text;
  }
}

function setLauncherStatus({ title, subtitle }) {
  const titleElement = document.getElementById("launcherStatusTitle");
  const subtitleElement = document.getElementById("launcherStatusSubtitle");

  if (titleElement) titleElement.textContent = title;
  if (subtitleElement) subtitleElement.textContent = subtitle;
}

function renderRuntimeSummary(summary) {
  const element = document.getElementById("launcherRuntimeSummary");
  if (!element) return;

  element.innerHTML = `
    <div class="stats-row"><dt>Boundaries</dt><dd>${summary.boundariesLoaded ? "Loaded" : "Missing"}</dd></div>
    <div class="stats-row"><dt>Origins</dt><dd>${summary.originsLoaded ? "Loaded" : "Missing"}</dd></div>
    <div class="stats-row"><dt>Manifest</dt><dd>${summary.manifestLoaded ? "Loaded" : "Missing"}</dd></div>
    <div class="stats-row"><dt>Events</dt><dd>${summary.eventsCount}</dd></div>
    <div class="stats-row"><dt>Export</dt><dd>${summary.exportCount}</dd></div>
    <div class="stats-row"><dt>Joined</dt><dd>${summary.joinedCount}</dd></div>
    <div class="stats-row"><dt>Coordinate-valid</dt><dd>${summary.candidateCount}</dd></div>
    <div class="stats-row"><dt>Updated</dt><dd>${summary.updatedAt || "—"}</dd></div>
  `;
}

function getRuntimeSummary(runtimeData) {
  if (!runtimeData || typeof runtimeData !== "object") {
    return getEmptyRuntimeSummary();
  }

  const summary = runtimeData.summary || {};

  return {
    boundariesLoaded: Boolean(runtimeData.boundariesGeojson),
    originsLoaded: Array.isArray(runtimeData.originRows) && runtimeData.originRows.length > 0,
    manifestLoaded: Boolean(runtimeData.manifest),
    eventsCount: Number.isFinite(summary.eventsCount) ? summary.eventsCount : 0,
    exportCount: Number.isFinite(summary.exportCount) ? summary.exportCount : 0,
    joinedCount: Number.isFinite(summary.joinedCount) ? summary.joinedCount : 0,
    candidateCount: Number.isFinite(summary.candidateCount) ? summary.candidateCount : 0,
    updatedAt: summary.updatedAt || runtimeData.manifest?.updated_at || ""
  };
}

function getEmptyRuntimeSummary() {
  return {
    boundariesLoaded: false,
    originsLoaded: false,
    manifestLoaded: false,
    eventsCount: 0,
    exportCount: 0,
    joinedCount: 0,
    candidateCount: 0,
    updatedAt: ""
  };
}