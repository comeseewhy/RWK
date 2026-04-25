// workspace/controller.js

import { getConfig } from "../state/session.js";
import { loadRuntimeData } from "../data/loadRuntimeData.js";

import { createWorkspaceState } from "./state.js";
import {
  initWorkspaceMap,
  ensureWorkspaceLayers,
  clearWorkspaceLayers,
  createBoundsFromGeoJson,
  createBoundsFromGeoJsonFeatures,
  createBoundsFromRows,
  fitWorkspaceToBounds
} from "./mapCore.js";
import { computeWorkspaceView } from "./filters.js";
import {
  createBoundaryIndex,
  getBoundaryKey,
  getBoundaryName,
  getBoundaryStyle
} from "./boundaries.js";
import { renderJobMarkers, renderOriginMarkers } from "./markers.js";
import {
  cacheWorkspacePanelUi,
  bindWorkspacePanelEvents,
  renderWorkspaceResults,
  renderHeaderResults,
  renderWorkspaceFilters,
  renderWorkspaceSelection,
  renderWorkspaceRuntimeStatus,
  setWorkspaceMessage
} from "./panels.js";
import { createWorkspaceDebug } from "./debug.js";
import { configToWorkspaceState } from "./configBridge.js";
import { projectRuntimeForWorkspace } from "./runtimeBridge.js";

export function createWorkspaceController(deps = {}) {
  const state = createWorkspaceState();

  let ui = null;
  let debug = null;
  let isInitialized = false;
  let projectBounds = null;

  async function init({
    root = document,
    mapElementId = "map",
    runtimeData = null
  } = {}) {
    if (isInitialized) {
      destroyMap();
      isInitialized = false;
    }

    ui = cacheWorkspacePanelUi(root);
    debug = createWorkspaceDebug(ui.debugOutput);

    bindTopLevelUi();

    debug.clear();
    debug.log("Workspace bootstrap started");
    setWorkspaceMessage(ui, "Preparing workspace runtime...");

    try {
      state.config = getConfig();

      debug.log(
        `Session config ${
          state.config
            ? `loaded:${state.config?.meta?.presetId || "custom"}`
            : "not found"
        }`
      );

      state.map = initWorkspaceMap({ elementId: mapElementId });
      state.layers = ensureWorkspaceLayers(state.map);

      const rawRuntime =
        runtimeData ||
        (await loadRuntimeData(handleProgressUpdate));

      debug.log(
        runtimeData
          ? "Shared runtime received"
          : "Runtime loaded directly"
      );

      state.runtime = projectRuntimeForWorkspace(rawRuntime);
      state.boundaryIndex = createBoundaryIndex(state.runtime.boundariesGeojson);
      projectBounds = buildProjectBounds();

      applyBridgedConfig();
      normalizeCurrentStateForPanelModel();
      bindWorkspaceUi();

      renderWorkspaceRuntimeStatus(ui, state.runtime.summary);
      renderWorkspaceFilters(ui, state);
      refreshView({ cameraMode: "initial" });

      isInitialized = true;
      debug.log("Workspace initialized");

      return api;
    } catch (error) {
      console.error("[RWK] workspace init failed:", error);
      debug?.log(`Init failed:${error.message}`);
      setWorkspaceMessage(ui, `Workspace failed to initialize: ${error.message}`);
      throw error;
    }
  }

  function bindTopLevelUi() {
    ui.backToLauncherButton?.addEventListener("click", () => {
      if (typeof deps.onBack === "function") {
        deps.onBack();
        return;
      }

      window.location.href = "./index.html";
    });
  }

  function bindWorkspaceUi() {
    bindWorkspacePanelEvents(ui, {
      onToggleDay(dayKey) {
        toggleArrayValueSafe(state.refinements.days, dayKey);
        refreshView({ cameraMode: "preserve" });
      },

      onToggleAppointmentType(appointmentType) {
        toggleArrayValueSafe(state.refinements.appointmentTypes, appointmentType);
        refreshView({ cameraMode: "preserve" });
      },

      onToggleOriginType(originType) {
        toggleArrayValueSafe(state.refinements.originTypes, originType);
        refreshView({ cameraMode: "preserve" });
      },

      onClearBoundary() {
        state.selection.boundaryKeys = [];
        refreshView({ cameraMode: "project" });
      }
    });
  }

  function handleProgressUpdate(progress) {
    const map = {
      starting: "Preparing runtime data",
      boundaries: "Boundaries loaded",
      origins: "Origins loaded",
      manifest: "Manifest loaded",
      events: "Events snapshot loaded",
      export: "Spatial export loaded",
      complete: "Workspace runtime ready"
    };

    const message = map[progress?.step] || progress?.label || "Working";
    setWorkspaceMessage(ui, message);
    debug?.log(message);
  }

  function applyBridgedConfig() {
    const bridged = configToWorkspaceState(state.config);

    state.selection = {
      ...state.selection,
      ...(bridged.selection || {}),
      boundaryKeys: Array.isArray(bridged.selection?.boundaryKeys)
        ? [...bridged.selection.boundaryKeys]
        : []
    };

    state.refinements = {
      ...state.refinements,
      ...(bridged.refinements || {})
    };
  }

  function normalizeCurrentStateForPanelModel() {
    state.refinements.visitBuckets = [];
    state.selection.originId = "";

    if (!Array.isArray(state.refinements.appointmentTypes)) {
      state.refinements.appointmentTypes = [];
    }

    if (!Array.isArray(state.refinements.days)) {
      state.refinements.days = [];
    }

    if (!Array.isArray(state.refinements.originTypes)) {
      state.refinements.originTypes = [];
    }

    if (!Array.isArray(state.selection.boundaryKeys)) {
      state.selection.boundaryKeys = [];
    }
  }

  function applyConfig(config = null) {
    state.config = config || null;
    applyBridgedConfig();
    normalizeCurrentStateForPanelModel();

    debug?.log(
      `Config applied:${
        state.config?.meta?.presetId ||
        state.config?.meta?.label ||
        "custom"
      }`
    );

    refreshView({
      cameraMode: state.selection.boundaryKeys.length > 0
        ? "selected-boundaries"
        : "project"
    });
  }

  function refreshView({ cameraMode = "preserve" } = {}) {
    if (!state.runtime) {
      debug?.log("Refresh skipped:no runtime");
      return;
    }

    normalizeCurrentStateForPanelModel();

    const view = computeWorkspaceView({
      runtime: state.runtime,
      config: state.config,
      refinements: state.refinements,
      selection: state.selection
    });

    state.populationRows = view.populationRows;
    state.visibleRows = view.visibleRows;
    state.visibleOrigins = view.visibleOrigins;
    state.results = {
      ...state.results,
      ...view.counts
    };

    clearWorkspaceLayers(state.layers);
    renderBoundaryLayer();

    renderJobMarkers({
      rows: state.visibleRows,
      layerGroup: state.layers.jobs,
      selectedBoundaryKeys: state.selection.boundaryKeys
    });

    renderOriginMarkers({
      origins: state.visibleOrigins,
      layerGroup: state.layers.origins,
      selectedOriginId: ""
    });

    renderWorkspaceResults(ui, state.results);
    renderWorkspaceFilters(ui, state);

    const selectedBoundaryNames = getSelectedBoundaryNames();
    const selectedBoundaryName = formatBoundarySelectionLabel(selectedBoundaryNames);

    renderWorkspaceSelection(ui, {
      selectedBoundaryName
    });

    renderHeaderResults(ui, {
      visibleRows: state.visibleRows.length,
      visibleOrigins: state.visibleOrigins.length,
      filteredRows: state.results.filteredCount,
      selectedBoundaryNames,
      selectedDays: state.refinements.days.length,
      selectedAppointmentTypes: state.refinements.appointmentTypes.length,
      selectedOriginTypes: state.refinements.originTypes.length
    });

    applyMapCamera(cameraMode);

    debug?.log(
      [
        `candidate=${state.results.candidateCount}`,
        `filtered=${state.results.filteredCount}`,
        `boundary=${state.results.boundaryCount}`,
        `visible=${state.results.visibleCount}`,
        `origins=${state.results.visibleOriginCount}`,
        `boundaries=${state.selection.boundaryKeys.length ? state.selection.boundaryKeys.join(",") : "none"}`,
        `days=${state.refinements.days.length}`,
        `appointments=${state.refinements.appointmentTypes.length}`,
        `originTypes=${state.refinements.originTypes.length}`,
        `camera=${cameraMode}`,
        `markerSelection=${state.selection.boundaryKeys.length > 0 ? "on" : "off"}`
      ].join(", ")
    );
  }

  function renderBoundaryLayer() {
    if (!state.runtime.boundariesGeojson || !state.layers.boundaries) {
      return;
    }

    const activeCountsByBoundary = new Map();
    const selectedBoundaryKeys = new Set(state.selection.boundaryKeys || []);

    state.visibleRows.forEach((row) => {
      if (!row._boundaryKey) return;

      activeCountsByBoundary.set(
        row._boundaryKey,
        (activeCountsByBoundary.get(row._boundaryKey) || 0) + 1
      );
    });

    const boundaryLayer = L.geoJSON(state.runtime.boundariesGeojson, {
      style: (feature) => {
        const key = getBoundaryKey(feature);
        const activeCount = activeCountsByBoundary.get(key) || 0;
        const isSelected = selectedBoundaryKeys.has(key);

        return getBoundaryStyle({
          isSelected,
          activeCount
        });
      },

      onEachFeature: (feature, layer) => {
        const key = getBoundaryKey(feature);
        const name = getBoundaryName(feature) || key || "Boundary";

        layer.bindTooltip(name, { sticky: true });

        layer.on("click", () => {
          toggleBoundarySelection(key);

          refreshView({
            cameraMode:
              state.selection.boundaryKeys.length > 0
                ? "selected-boundaries"
                : "project"
          });
        });
      }
    });

    boundaryLayer.addTo(state.layers.boundaries);
  }

  function toggleBoundarySelection(boundaryKey) {
    if (!boundaryKey) return;

    const index = state.selection.boundaryKeys.indexOf(boundaryKey);

    if (index >= 0) {
      state.selection.boundaryKeys.splice(index, 1);
    } else {
      state.selection.boundaryKeys.push(boundaryKey);
    }
  }

  function applyMapCamera(cameraMode) {
    if (!state.map) return;

    if (cameraMode === "preserve") {
      return;
    }

    if (cameraMode === "selected-boundaries") {
      fitToSelectedBoundaries();
      return;
    }

    if (cameraMode === "initial" || cameraMode === "project") {
      fitToProjectBounds();
    }
  }

  function fitToSelectedBoundaries() {
    const features = getSelectedBoundaryFeatures();

    if (features.length === 0) {
      fitToProjectBounds();
      return;
    }

    const bounds = createBoundsFromGeoJsonFeatures(features);

    if (!bounds) {
      fitToProjectBounds();
      return;
    }

    fitWorkspaceToBounds(state.map, bounds, {
      mode: "selected-boundaries",
      maxZoom: getSelectedBoundaryMaxZoom(features.length)
    });
  }

  function fitToProjectBounds() {
    const bounds =
      projectBounds ||
      createBoundsFromGeoJson(state.runtime?.boundariesGeojson) ||
      createBoundsFromRows(state.populationRows) ||
      createBoundsFromRows(state.runtime?.candidateRows || []);

    if (!bounds) return;

    fitWorkspaceToBounds(state.map, bounds, {
      mode: "project",
      maxZoom: 12
    });
  }

  function buildProjectBounds() {
    return (
      createBoundsFromGeoJson(state.runtime?.boundariesGeojson) ||
      createBoundsFromRows(state.runtime?.candidateRows || [])
    );
  }

  function getSelectedBoundaryMaxZoom(selectedCount) {
    return selectedCount > 1 ? 12 : 13;
  }

  function getSelectedBoundaryFeatures() {
    return state.selection.boundaryKeys
      .map((boundaryKey) => state.boundaryIndex.featuresByKey.get(boundaryKey))
      .filter(Boolean);
  }

  function getSelectedBoundaryNames() {
    return getSelectedBoundaryFeatures().map((feature) => {
      const key = getBoundaryKey(feature);
      return getBoundaryName(feature) || key || "Boundary";
    });
  }

  function formatBoundarySelectionLabel(names) {
    if (!Array.isArray(names) || names.length === 0) {
      return "None";
    }

    if (names.length === 1) {
      return names[0];
    }

    return `${names.length} boundaries selected`;
  }

  function destroyMap() {
    try {
      state.map?.remove?.();
    } catch (error) {
      console.warn("[RWK] failed to destroy map cleanly:", error);
    }

    state.map = null;
    state.layers = {
      boundaries: null,
      jobs: null,
      origins: null
    };
  }

  function exitWorkspace() {
    debug?.log("Exited workspace");
    destroyMap();
    isInitialized = false;
  }

  const api = {
    init,
    applyConfig,
    refreshView,
    exitWorkspace,
    getState: () => state
  };

  return api;
}

function toggleArrayValueSafe(array, value) {
  if (!Array.isArray(array) || !value) return;

  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }
}