import { formatTimestamp } from "./utils.js";

const DAY_META = [
  { value: "sunday", label: "Sun", color: "#dc2626" },
  { value: "monday", label: "Mon", color: "#ea580c" },
  { value: "tuesday", label: "Tue", color: "#ca8a04" },
  { value: "wednesday", label: "Wed", color: "#16a34a" },
  { value: "thursday", label: "Thu", color: "#0891b2" },
  { value: "friday", label: "Fri", color: "#2563eb" },
  { value: "saturday", label: "Sat", color: "#7c3aed" }
];

const VISIT_BUCKETS = Array.from({ length: 10 }, (_, index) => {
  const value = String(index + 1);
  return {
    value,
    label: `${value}x`
  };
});

const ORIGIN_TYPE_META = [
  { value: "warehouse", label: "Warehouse", color: "#0f766e" },
  { value: "showroom", label: "Showroom", color: "#7c3aed" },
  { value: "office", label: "Office", color: "#2563eb" },
  { value: "supplier", label: "Supplier", color: "#b45309" },
  { value: "other", label: "Other", color: "#475569" }
];

export function cacheWorkspacePanelUi(root = document) {
  return {
    backToLauncherButton: root.getElementById("backToLauncherButton"),

    dayToggleGroup: root.getElementById("dayToggleGroup"),
    visitToggleGroup: root.getElementById("visitToggleGroup"),
    originTypeToggleGroup: root.getElementById("originTypeToggleGroup"),

    candidateMarkerCount: root.getElementById("candidateMarkerCount"),
    filteredRowCount: root.getElementById("filteredRowCount"),
    boundaryMatchedCount: root.getElementById("boundaryMatchedCount"),
    visibleMarkerCount: root.getElementById("visibleMarkerCount"),
    resultsMessage: root.getElementById("resultsMessage"),

    selectedBoundaryName: root.getElementById("selectedBoundaryName"),
    selectedOriginName: root.getElementById("selectedOriginName"),

    clearBoundaryButton: root.getElementById("clearBoundaryButton"),
    clearOriginButton: root.getElementById("clearOriginButton"),

    debugOutput: root.getElementById("debugOutput")
  };
}

export function bindWorkspacePanelEvents(ui, handlers = {}) {
  ui.clearBoundaryButton?.addEventListener("click", () => {
    handlers.onClearBoundary?.();
  });

  ui.clearOriginButton?.addEventListener("click", () => {
    handlers.onClearOrigin?.();
  });

  bindToggleGroup(ui.dayToggleGroup, "day", handlers.onToggleDay);
  bindToggleGroup(ui.visitToggleGroup, "visitBucket", handlers.onToggleVisitBucket);
  bindToggleGroup(ui.originTypeToggleGroup, "originType", handlers.onToggleOriginType);
}

export function renderWorkspaceFilters(ui, state) {
  renderDayToggles(ui.dayToggleGroup, state.refinements.days || []);
  renderVisitToggles(ui.visitToggleGroup, state.refinements.visitBuckets || []);
  renderOriginTypeToggles(ui.originTypeToggleGroup, state.refinements.originTypes || []);
}

export function renderWorkspaceResults(ui, results) {
  setText(ui.candidateMarkerCount, String(results.candidateCount || 0));
  setText(ui.filteredRowCount, String(results.filteredCount || 0));
  setText(ui.boundaryMatchedCount, String(results.boundaryCount || 0));
  setText(ui.visibleMarkerCount, String(results.visibleCount || 0));
}

export function renderWorkspaceSelection(
  ui,
  {
    selectedBoundaryName = "None",
    selectedOriginName = "None"
  } = {}
) {
  setText(ui.selectedBoundaryName, selectedBoundaryName || "None");
  setText(ui.selectedOriginName, selectedOriginName || "None");
}

export function renderWorkspaceRuntimeStatus(ui, summary = {}) {
  if (!summary?.updatedAt) {
    return;
  }

  setWorkspaceMessage(
    ui,
    `Runtime ready. Updated ${formatTimestamp(summary.updatedAt)}.`
  );
}

export function setWorkspaceMessage(ui, text) {
  setText(ui.resultsMessage, text || "Ready.");
}

function renderDayToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: DAY_META,
    selectedValues,
    className: "toggle-chip toggle-chip--day",
    decorate(button, option) {
      button.style.setProperty("--day-color", option.color);
    },
    datasetKey: "day"
  });
}

function renderVisitToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: VISIT_BUCKETS,
    selectedValues,
    className: "toggle-chip toggle-chip--visit",
    datasetKey: "visitBucket"
  });
}

function renderOriginTypeToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: ORIGIN_TYPE_META,
    selectedValues,
    className: "toggle-chip toggle-chip--origin",
    decorate(button, option) {
      button.style.setProperty("--origin-color", option.color);
    },
    datasetKey: "originType"
  });
}

function renderToggleButtons({
  container,
  options,
  selectedValues,
  className,
  decorate = null,
  datasetKey
}) {
  if (!container) {
    return;
  }

  const selected = new Set(selectedValues || []);
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = option.label;
    button.dataset[datasetKey] = option.value;

    const isActive = selected.has(option.value);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));

    if (typeof decorate === "function") {
      decorate(button, option);
    }

    fragment.appendChild(button);
  });

  container.appendChild(fragment);
}

function bindToggleGroup(container, datasetKey, handler) {
  if (!container || typeof handler !== "function") {
    return;
  }

  container.addEventListener("click", (event) => {
    const button = event.target.closest(`button[data-${camelToKebab(datasetKey)}]`);
    if (!button) {
      return;
    }

    handler(button.dataset[datasetKey]);
  });
}

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}