// workspace/controller.js

import { getConfig } from "../state/session.js";
import { loadRuntimeData } from "../data/loadRuntimeData.js";

import { createWorkspaceState } from "./state.js";
import {
  initWorkspaceMap,
  ensureWorkspaceLayers,
  clearWorkspaceLayers,
  fitWorkspaceToData
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
    debug.log("Workspace bootstrap started.");
    setWorkspaceMessage(ui, "Preparing workspace runtime...");

    try {
      state.config = getConfig();
      debug.log(
        `Session config ${state.config ? `loaded (${state.config?.meta?.presetId || "custom"})` : "not found"}.`
      );

      state.map = initWorkspaceMap({ elementId: mapElementId });
      state.layers = ensureWorkspaceLayers(state.map);

      const rawRuntime =
        runtimeData ||
        (await loadRuntimeData(handleProgressUpdate));

      if (!runtimeData) {
        debug.log("Workspace loaded runtime directly.");
      } else {
        debug.log("Workspace received shared runtime.");
      }

      state.runtime = projectRuntimeForWorkspace(rawRuntime);
      state.boundaryIndex = createBoundaryIndex(state.runtime.boundariesGeojson);

      applyBridgedConfig();
      bindWorkspaceUi();

      renderWorkspaceRuntimeStatus(ui, state.runtime.summary);
      renderWorkspaceFilters(ui, state);
      refreshView();

      isInitialized = true;
      debug.log("Workspace controller initialized.");
      return api;
    } catch (error) {
      console.error("[RWK] workspace init failed:", error);
      debug?.log(`Workspace init failed: ${error.message}`);
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
        refreshView();
      },
      onToggleVisitBucket(bucket) {
        toggleArrayValueSafe(state.refinements.visitBuckets, bucket);
        refreshView();
      },
      onToggleOriginType(originType) {
        toggleArrayValueSafe(state.refinements.originTypes, originType);
        refreshView();
      },
      onClearBoundary() {
        state.selection.boundaryKey = "";
        refreshView();
      },
      onClearOrigin() {
        state.selection.originId = "";
        refreshView();
      }
    });
  }

  function handleProgressUpdate(progress) {
    const map = {
      starting: "Preparing runtime data...",
      boundaries: "Boundaries loaded.",
      origins: "Origins loaded.",
      manifest: "Manifest loaded.",
      events: "Events snapshot loaded.",
      export: "Spatial export loaded.",
      complete: "Workspace runtime is ready."
    };

    const message = map[progress?.step] || progress?.label || "Working...";
    setWorkspaceMessage(ui, message);
    debug?.log(message);
  }

  function applyBridgedConfig() {
    const bridged = configToWorkspaceState(state.config);

    state.selection = {
      ...state.selection,
      ...(bridged.selection || {})
    };

    state.refinements = {
      ...state.refinements,
      ...(bridged.refinements || {})
    };
  }

  function applyConfig(config = null) {
    state.config = config || null;
    applyBridgedConfig();
    debug?.log(
      `Config applied: ${state.config?.meta?.presetId || state.config?.meta?.label || "custom"}`
    );
    refreshView();
  }

  function refreshView() {
    if (!state.runtime) {
      debug?.log("Refresh skipped: runtime is not available.");
      return;
    }

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
      selectedBoundaryKey: state.selection.boundaryKey
    });

    renderOriginMarkers({
      origins: state.visibleOrigins,
      layerGroup: state.layers.origins,
      selectedOriginId: state.selection.originId,
      onSelect(origin) {
        state.selection.originId =
          state.selection.originId === origin.id ? "" : origin.id;
        refreshView();
      }
    });

    renderWorkspaceResults(ui, state.results);
    renderWorkspaceFilters(ui, state);
    renderWorkspaceSelection(ui, {
      selectedBoundaryName: getSelectedBoundaryName(),
      selectedOriginName: getSelectedOriginName()
    });

    if (state.visibleRows.length > 0) {
      fitWorkspaceToData(state.map, state.visibleRows);
    } else if (state.layers.boundaries?.getBounds?.()?.isValid?.()) {
      fitWorkspaceToData(state.map, state.layers.boundaries.getBounds());
    }

    setWorkspaceMessage(
      ui,
      buildResultsMessage({
        visibleRows: state.visibleRows.length,
        visibleOrigins: state.visibleOrigins.length,
        boundaryName: getSelectedBoundaryName(),
        selectedOriginName: getSelectedOriginName()
      })
    );

    debug?.log(
      [
        "Workspace refresh complete.",
        `candidate=${state.results.candidateCount}`,
        `filtered=${state.results.filteredCount}`,
        `visible=${state.results.visibleCount}`,
        `origins=${state.results.visibleOriginCount}`,
        `boundary=${state.selection.boundaryKey || "none"}`,
        `origin=${state.selection.originId || "none"}`
      ].join(" ")
    );
  }

  function renderBoundaryLayer() {
    if (!state.runtime.boundariesGeojson || !state.layers.boundaries) {
      return;
    }

    const countsByBoundary = new Map();

    state.populationRows.forEach((row) => {
      if (!row._boundaryKey) return;
      countsByBoundary.set(
        row._boundaryKey,
        (countsByBoundary.get(row._boundaryKey) || 0) + 1
      );
    });

    const boundaryLayer = L.geoJSON(state.runtime.boundariesGeojson, {
      style: (feature) => {
        const key = getBoundaryKey(feature);
        const count = countsByBoundary.get(key) || 0;
        const isSelected = key === state.selection.boundaryKey;
        return getBoundaryStyle({ isSelected, count });
      },
      onEachFeature: (feature, layer) => {
        const key = getBoundaryKey(feature);
        const name = getBoundaryName(feature) || key || "Boundary";

        layer.bindTooltip(name, { sticky: true });

        layer.on("click", () => {
          state.selection.boundaryKey =
            state.selection.boundaryKey === key ? "" : key;
          refreshView();
        });
      }
    });

    boundaryLayer.addTo(state.layers.boundaries);
  }

  function getSelectedBoundaryName() {
    if (!state.selection.boundaryKey) {
      return "None";
    }

    const feature = state.boundaryIndex.featuresByKey.get(state.selection.boundaryKey);
    return feature ? getBoundaryName(feature) || state.selection.boundaryKey : "None";
  }

  function getSelectedOriginName() {
    if (!state.selection.originId) {
      return "None";
    }

    const origin = state.runtime.originRows.find(
      (item) => item.id === state.selection.originId
    );

    return origin?.name || state.selection.originId;
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
    debug?.log("Exited workspace.");
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
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }
}

function buildResultsMessage({
  visibleRows,
  visibleOrigins,
  boundaryName,
  selectedOriginName
}) {
  let message = `Showing ${visibleRows} job marker(s) and ${visibleOrigins} origin marker(s).`;

  if (boundaryName && boundaryName !== "None") {
    message += ` Boundary: ${boundaryName}.`;
  }

  if (selectedOriginName && selectedOriginName !== "None") {
    message += ` Selected origin: ${selectedOriginName}.`;
  }

  return message;
}