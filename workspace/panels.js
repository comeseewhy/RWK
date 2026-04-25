// workspace/panels.js

import { formatTimestamp } from "./utils.js";

const DAY_META = [
  { value: "monday", label: "Mon", color: "#ea580c" },
  { value: "tuesday", label: "Tue", color: "#ca8a04" },
  { value: "wednesday", label: "Wed", color: "#16a34a" },
  { value: "thursday", label: "Thu", color: "#0891b2" },
  { value: "friday", label: "Fri", color: "#2563eb" },
  { value: "saturday", label: "Sat", color: "#7c3aed" },
  { value: "sunday", label: "Sun", color: "#dc2626" }
];

const ORIGIN_TYPE_META = [
  { value: "warehouse", label: "Warehouse", color: "#0f766e" },
  { value: "showroom", label: "Showroom", color: "#7c3aed" }
];

const APPOINTMENT_TYPE_META = [
  { value: "installers", label: "Installers", color: "#1d4ed8" },
  { value: "countertop_template", label: "Countertop Template", color: "#7c3aed" },
  { value: "cabinet_delivery", label: "Cabinet Delivery", color: "#0f766e" },
  { value: "initial_template", label: "Initial Template", color: "#d97706" }
];

export function cacheWorkspacePanelUi(root = document) {
  return {
    backToLauncherButton: root.getElementById("backToLauncherButton"),

    headerResultPill: root.getElementById("headerResultPill"),
    headerResultCount: root.getElementById("headerResultCount"),
    headerResultMeta: root.getElementById("headerResultMeta"),

    dayToggleGroup: root.getElementById("dayToggleGroup"),
    appointmentTypeToggleGroup: root.getElementById("appointmentTypeToggleGroup"),
    originTypeToggleGroup: root.getElementById("originTypeToggleGroup"),

    candidateMarkerCount: root.getElementById("candidateMarkerCount"),
    filteredRowCount: root.getElementById("filteredRowCount"),
    boundaryMatchedCount: root.getElementById("boundaryMatchedCount"),
    visibleMarkerCount: root.getElementById("visibleMarkerCount"),
    resultsMessage: root.getElementById("resultsMessage"),

    selectedBoundaryName: root.getElementById("selectedBoundaryName"),

    clearBoundaryButton: root.getElementById("clearBoundaryButton"),

    debugOutput: root.getElementById("debugOutput")
  };
}

export function bindWorkspacePanelEvents(ui, handlers = {}) {
  ui.clearBoundaryButton?.addEventListener("click", () => {
    handlers.onClearBoundary?.();
  });

  bindToggleGroup(ui.dayToggleGroup, "day", handlers.onToggleDay);
  bindToggleGroup(
    ui.appointmentTypeToggleGroup,
    "appointmentType",
    handlers.onToggleAppointmentType
  );
  bindToggleGroup(ui.originTypeToggleGroup, "originType", handlers.onToggleOriginType);
}

export function renderWorkspaceFilters(ui, state) {
  renderDayToggles(ui.dayToggleGroup, state.refinements.days || []);
  renderAppointmentTypeToggles(
    ui.appointmentTypeToggleGroup,
    state.refinements.appointmentTypes || []
  );
  renderOriginTypeToggles(
    ui.originTypeToggleGroup,
    state.refinements.originTypes || []
  );
}

export function renderWorkspaceResults(ui, results) {
  setText(ui.candidateMarkerCount, String(results.candidateCount || 0));
  setText(ui.filteredRowCount, String(results.filteredCount || 0));
  setText(ui.boundaryMatchedCount, String(results.boundaryCount || 0));
  setText(ui.visibleMarkerCount, String(results.visibleCount || 0));
}

export function renderHeaderResults(
  ui,
  {
    visibleRows = 0,
    visibleOrigins = 0,
    filteredRows = 0,
    selectedBoundaryNames = [],
    selectedDays = 0,
    selectedAppointmentTypes = 0,
    selectedOriginTypes = 0
  } = {}
) {
  const activeFilters = selectedDays + selectedAppointmentTypes + selectedOriginTypes;
  const countLabel = `${visibleRows.toLocaleString()} coordinates`;
  const boundaryNames = Array.isArray(selectedBoundaryNames)
    ? selectedBoundaryNames.filter(Boolean)
    : [];

  const parts = [];

  if (visibleOrigins > 0) {
    parts.push(`${visibleOrigins.toLocaleString()} origins`);
  }

  if (boundaryNames.length === 1) {
    parts.push(boundaryNames[0]);
  } else if (boundaryNames.length > 1) {
    parts.push(`${boundaryNames.length} boundaries selected`);
  }

  if (activeFilters === 0) {
    parts.push("blank until filtered");
  } else if (visibleRows === 0 && visibleOrigins === 0) {
    parts.push(`${filteredRows.toLocaleString()} filtered records`);
  } else {
    parts.push(`${activeFilters} active filter${activeFilters === 1 ? "" : "s"}`);
  }

  setText(ui.headerResultCount, countLabel);
  setText(ui.headerResultMeta, parts.join(" • "));

  if (ui.headerResultPill) {
    ui.headerResultPill.classList.toggle(
      "is-empty",
      activeFilters === 0 || (visibleRows === 0 && visibleOrigins === 0)
    );
  }
}

export function renderWorkspaceSelection(
  ui,
  {
    selectedBoundaryName = "None"
  } = {}
) {
  setText(ui.selectedBoundaryName, selectedBoundaryName || "None");
}

export function renderWorkspaceRuntimeStatus(ui, summary = {}) {
  if (!summary?.updatedAt) return;

  setWorkspaceMessage(
    ui,
    `Runtime ready. Updated ${formatTimestamp(summary.updatedAt)}.`
  );
}

export function setWorkspaceMessage(ui, text) {
  setText(ui.resultsMessage, text || "Ready.");
  setText(ui.headerResultMeta, text || "Ready.");
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

function renderAppointmentTypeToggles(container, selectedValues) {
  renderToggleButtons({
    container,
    options: APPOINTMENT_TYPE_META,
    selectedValues,
    className: "toggle-chip toggle-chip--appointment",
    decorate(button, option) {
      button.style.setProperty("--appointment-color", option.color);
    },
    datasetKey: "appointmentType"
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
  if (!container) return;

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
  if (!container || typeof handler !== "function") return;

  container.addEventListener("click", (event) => {
    const button = event.target.closest(`button[data-${camelToKebab(datasetKey)}]`);
    if (!button) return;

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