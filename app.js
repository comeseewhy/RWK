const CONFIG = {
  boundariesUrl: "./data/boundaries.geojson",

  /*
    REQUIRED:
    Set this to your public Supabase Storage bucket base path.

    Example:
    https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/live-data
  */
  supabaseBaseUrl:
    "https://avtthmyizixxlkblbzqe.supabase.co/storage/v1/object/public/live-data",

  manifestPath: "meta/manifest.json",
  eventsCsvPath: "csv/events_active_snapshot.csv",
  exportCsvPath: "csv/export_confirmed_verified.csv",

  defaultMapCenter: [43.6532, -79.3832],
  defaultMapZoom: 9,

  fitBoundsPaddingDefault: [24, 24],
  fitBoundsPaddingBoundarySelected: [28, 28],

  markerRadius: 6,

  organizerAliases: {
    "e8gq6ptj73o1p36cm3cl6c42j4@group.calendar.google.com": "INSTALL",
    "bfqu2a3urejcnobl2p80tebo0g@group.calendar.google.com": "TEMPLATE"
  },

  dayMeta: {
    sunday: { index: 0, label: "Sun", color: "#dc2626" },
    monday: { index: 1, label: "Mon", color: "#ea580c" },
    tuesday: { index: 2, label: "Tue", color: "#ca8a04" },
    wednesday: { index: 3, label: "Wed", color: "#16a34a" },
    thursday: { index: 4, label: "Thu", color: "#0891b2" },
    friday: { index: 5, label: "Fri", color: "#2563eb" },
    saturday: { index: 6, label: "Sat", color: "#7c3aed" }
  }
};

const state = {
  map: null,
  boundaryLayer: null,
  markerLayer: null,
  boundariesGeojson: null,
  selectedBoundaryLayer: null,
  selectedBoundaryFeature: null,

  manifest: null,
  eventsRows: [],
  exportRows: [],
  joinedRows: [],
  derivedRows: [],
  populationRows: [],
  filteredRows: [],
  visibleRows: [],

  filters: {
    keyword: "",
    organizers: [],
    days: [],
    year: "all"
  },

  boundaryCounts: {},

  isLoading: false,
  lastError: null,

  lastLoadSummary: {
    boundaryFeatureCount: 0,
    candidateMarkerRows: 0,
    matchedRows: 0,
    unmatchedExportRows: 0,
    eventRowsWithoutKey: 0,
    exportRowsWithoutKey: 0,
    rowsMissingCoordinates: 0,
    populationRows: 0,
    filteredRows: 0,
    boundaryMatchedRows: 0,
    visibleRows: 0
  }
};

const ui = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheUi();
  bindUi();
  initMap();

  setStatus("appStatus", "Running");
  logDebug("App initialized.");

  await loadApp();
}

function cacheUi() {
  ui.appStatus = document.getElementById("appStatus");
  ui.manifestStatus = document.getElementById("manifestStatus");
  ui.boundariesStatus = document.getElementById("boundariesStatus");
  ui.eventsStatus = document.getElementById("eventsStatus");
  ui.exportStatus = document.getElementById("exportStatus");
  ui.joinedCount = document.getElementById("joinedCount");
  ui.updatedAt = document.getElementById("updatedAt");

  ui.candidateMarkerCount = document.getElementById("candidateMarkerCount");
  ui.filteredRowCount = document.getElementById("filteredRowCount");
  ui.boundaryMatchedCount = document.getElementById("boundaryMatchedCount");
  ui.visibleMarkerCount = document.getElementById("visibleMarkerCount");
  ui.resultsMessage = document.getElementById("resultsMessage");

  ui.selectedBoundaryName = document.getElementById("selectedBoundaryName");
  ui.boundaryFeatureCount = document.getElementById("boundaryFeatureCount");

  ui.keywordInput = document.getElementById("keywordInput");
  ui.organizerToggleGroup = document.getElementById("organizerToggleGroup");
  ui.dayToggleGroup = document.getElementById("dayToggleGroup");
  ui.yearFilter = document.getElementById("yearFilter");
  ui.clearFiltersButton = document.getElementById("clearFiltersButton");

  ui.debugOutput = document.getElementById("debugOutput");
  ui.refreshButton = document.getElementById("refreshButton");
  ui.clearBoundaryButton = document.getElementById("clearBoundaryButton");
}

function bindUi() {
  ui.refreshButton?.addEventListener("click", async () => {
    await loadApp();
  });

  ui.clearBoundaryButton?.addEventListener("click", () => {
    clearBoundarySelection();
    tryFitMapToLayer(state.boundaryLayer, CONFIG.fitBoundsPaddingDefault);
    applyFiltersAndRender({ fitToVisible: false });
  });

  ui.keywordInput?.addEventListener("input", () => {
    state.filters.keyword = ui.keywordInput.value.trim();
    applyFiltersAndRender();
  });

  ui.yearFilter?.addEventListener("change", () => {
    state.filters.year = ui.yearFilter.value;
    applyFiltersAndRender();
  });

  ui.clearFiltersButton?.addEventListener("click", () => {
    clearFilters();
    applyFiltersAndRender({ fitToVisible: false });
  });
}

function initMap() {
  state.map = L.map("map", {
    zoomControl: true
  }).setView(CONFIG.defaultMapCenter, CONFIG.defaultMapZoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
}

async function loadApp() {
  if (state.isLoading) {
    logDebug("Load skipped: already in progress.");
    return;
  }

  state.isLoading = true;
  state.lastError = null;

  disableButton(ui.refreshButton, true);

  resetUiForLoad();
  clearDebug();
  resetRuntimeData();

  logDebug("Reload started.");
  logDebug(`Boundaries URL: ${CONFIG.boundariesUrl}`);
  logDebug(`Supabase base URL: ${CONFIG.supabaseBaseUrl || "[blank]"}`);

  try {
    await loadBoundaries();
    await loadRemoteData();
    joinData();
    deriveRows();
    populateFilterOptions();
    applyFiltersAndRender({ fitToVisible: false });
    updateSummaryUi();
    finalizeAppStatus();
    logDebug("Reload finished successfully.");
  } catch (error) {
    console.error(error);
    state.lastError = error;
    setStatus("appStatus", "Error");
    setText(ui.resultsMessage, `Load failed: ${error.message}`);
    logDebug(`Fatal load error: ${error.message}`);
  } finally {
    state.isLoading = false;
    disableButton(ui.refreshButton, false);
  }
}

function resetUiForLoad() {
  setStatus("appStatus", "Loading");
  setStatus("manifestStatus", "Pending");
  setStatus("boundariesStatus", "Pending");
  setStatus("eventsStatus", "Pending");
  setStatus("exportStatus", "Pending");

  setText(ui.updatedAt, "—");
  setText(ui.joinedCount, "0");
  setText(ui.candidateMarkerCount, "0");
  setText(ui.filteredRowCount, "0");
  setText(ui.boundaryMatchedCount, "0");
  setText(ui.visibleMarkerCount, "0");
  setText(ui.selectedBoundaryName, "None");
  setText(ui.resultsMessage, "Loading live data…");
}

function resetRuntimeData() {
  state.manifest = null;
  state.eventsRows = [];
  state.exportRows = [];
  state.joinedRows = [];
  state.derivedRows = [];
  state.populationRows = [];
  state.filteredRows = [];
  state.visibleRows = [];
  state.boundariesGeojson = null;
  state.selectedBoundaryFeature = null;
  state.selectedBoundaryLayer = null;
  state.boundaryCounts = {};
  clearFilters(false);

  state.lastLoadSummary = {
    boundaryFeatureCount: 0,
    candidateMarkerRows: 0,
    matchedRows: 0,
    unmatchedExportRows: 0,
    eventRowsWithoutKey: 0,
    exportRowsWithoutKey: 0,
    rowsMissingCoordinates: 0,
    populationRows: 0,
    filteredRows: 0,
    boundaryMatchedRows: 0,
    visibleRows: 0
  };

  resetFilterControls();
  resetFilterOptions();

  if (state.markerLayer) {
    state.markerLayer.clearLayers();
  }
}

async function loadBoundaries() {
  logDebug(`Loading boundaries from ${CONFIG.boundariesUrl}`);

  const response = await fetch(CONFIG.boundariesUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load boundaries GeoJSON (${response.status})`);
  }

  const geojson = await response.json();
  state.boundariesGeojson = geojson;

  if (state.boundaryLayer) {
    state.map.removeLayer(state.boundaryLayer);
  }

  state.boundaryLayer = L.geoJSON(geojson, {
    style: (feature) => getBoundaryStyle(feature, false),
    onEachFeature: onEachBoundaryFeature
  }).addTo(state.map);

  const featureCount = Array.isArray(geojson.features) ? geojson.features.length : 0;

  state.lastLoadSummary.boundaryFeatureCount = featureCount;

  setStatus("boundariesStatus", `Loaded (${featureCount})`);
  setText(ui.boundaryFeatureCount, String(featureCount));
  logDebug(`Boundaries loaded: ${featureCount} feature(s).`);

  tryFitMapToLayer(state.boundaryLayer, CONFIG.fitBoundsPaddingDefault);
}

function getBoundaryStyle(feature, isHover = false) {
  const boundaryKey = getBoundaryKey(feature);
  const count = state.boundaryCounts[boundaryKey] || 0;
  const isSelected =
    state.selectedBoundaryFeature &&
    getBoundaryKey(state.selectedBoundaryFeature) === boundaryKey;

  if (isSelected) {
    return {
      color: "#0f766e",
      weight: 2.8,
      opacity: 1,
      fillColor: count > 0 ? "#14b8a6" : "#cbd5e1",
      fillOpacity: count > 0 ? 0.2 : 0.12
    };
  }

  if (count > 0) {
    return {
      color: isHover ? "#b45309" : "#d97706",
      weight: isHover ? 2.4 : 1.8,
      opacity: 1,
      fillColor: "#fbbf24",
      fillOpacity: isHover ? 0.16 : 0.1
    };
  }

  return {
    color: isHover ? "#64748b" : "#94a3b8",
    weight: isHover ? 2 : 1.2,
    opacity: 0.95,
    fillColor: "#e2e8f0",
    fillOpacity: isHover ? 0.12 : 0.06
  };
}

function onEachBoundaryFeature(feature, layer) {
  layer.on({
    mouseover: () => {
      if (state.selectedBoundaryLayer !== layer) {
        layer.setStyle(getBoundaryStyle(feature, true));
      }
    },
    mouseout: () => {
      if (state.selectedBoundaryLayer !== layer) {
        layer.setStyle(getBoundaryStyle(feature, false));
      }
    },
    click: () => {
      if (state.selectedBoundaryLayer === layer) {
        clearBoundarySelection();
        tryFitMapToLayer(state.boundaryLayer, CONFIG.fitBoundsPaddingDefault);
        applyFiltersAndRender({ fitToVisible: false });
        return;
      }

      selectBoundary(feature, layer);
      tryFitMapToLayer(layer, CONFIG.fitBoundsPaddingBoundarySelected);
      applyFiltersAndRender({ fitToVisible: false });
    }
  });

  const boundaryName = getBoundaryName(feature) || "Boundary";
  layer.bindTooltip(boundaryName, { sticky: true });
}

function selectBoundary(feature, layer) {
  clearBoundarySelection(false);

  state.selectedBoundaryFeature = feature;
  state.selectedBoundaryLayer = layer;
  layer.setStyle(getBoundaryStyle(feature, false));

  const boundaryName = getBoundaryName(feature) || "Boundary";
  setText(ui.selectedBoundaryName, boundaryName);
  logDebug(`Boundary selected: ${boundaryName}`);
}

function clearBoundarySelection(resetText = true) {
  if (state.selectedBoundaryLayer && state.selectedBoundaryFeature) {
    state.selectedBoundaryLayer.setStyle(getBoundaryStyle(state.selectedBoundaryFeature, false));
  }

  state.selectedBoundaryFeature = null;
  state.selectedBoundaryLayer = null;

  refreshBoundaryStyles();

  if (resetText) {
    setText(ui.selectedBoundaryName, "None");
    logDebug("Boundary selection cleared.");
  }
}

async function loadRemoteData() {
  if (!CONFIG.supabaseBaseUrl) {
    setStatus("manifestStatus", "Not configured");
    setStatus("eventsStatus", "Not configured");
    setStatus("exportStatus", "Not configured");

    state.manifest = null;
    state.eventsRows = [];
    state.exportRows = [];

    logDebug("Supabase base URL is blank. Skipping remote fetch.");
    return;
  }

  const manifestUrl = buildAssetUrl(CONFIG.manifestPath);
  const eventsUrl = buildAssetUrl(CONFIG.eventsCsvPath);
  const exportUrl = buildAssetUrl(CONFIG.exportCsvPath);

  logDebug(`Fetching manifest: ${manifestUrl}`);
  state.manifest = await fetchJson(manifestUrl);
  validateManifest(state.manifest);
  setStatus("manifestStatus", "Loaded");

  if (state.manifest?.updated_at) {
    setText(ui.updatedAt, formatTimestamp(state.manifest.updated_at));
    logDebug(`Manifest updated_at: ${state.manifest.updated_at}`);
  } else {
    logDebug("Manifest loaded, but updated_at is missing.");
  }

  logDebug(`Fetching events CSV: ${eventsUrl}`);
  const eventsCsv = await fetchText(eventsUrl);
  state.eventsRows = parseCsv(eventsCsv);
  setStatus("eventsStatus", `Loaded (${state.eventsRows.length})`);

  logDebug(`Fetching export CSV: ${exportUrl}`);
  const exportCsv = await fetchText(exportUrl);
  state.exportRows = parseCsv(exportCsv);
  setStatus("exportStatus", `Loaded (${state.exportRows.length})`);

  logDebug(
    `Remote data loaded. events=${state.eventsRows.length}, export=${state.exportRows.length}`
  );

  if (state.eventsRows.length > 0) {
    logDebug(`Events headers: ${Object.keys(state.eventsRows[0]).join(", ")}`);
  } else {
    logDebug("Events CSV parsed to 0 rows.");
  }

  if (state.exportRows.length > 0) {
    logDebug(`Export headers: ${Object.keys(state.exportRows[0]).join(", ")}`);
  } else {
    logDebug("Export CSV parsed to 0 rows.");
  }
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Manifest is not a valid JSON object.");
  }
}

function joinData() {
  const eventIndex = new Map();
  let eventRowsWithoutKey = 0;
  let exportRowsWithoutKey = 0;

  for (const row of state.eventsRows) {
    const joinKey = getJoinKey(row);

    if (!joinKey) {
      eventRowsWithoutKey += 1;
      continue;
    }

    eventIndex.set(joinKey, row);
  }

  const joined = [];
  let unmatchedExportCount = 0;
  let matchedRows = 0;
  let rowsMissingCoordinates = 0;
  let candidateMarkerRows = 0;

  for (const exportRow of state.exportRows) {
    const joinKey = getJoinKey(exportRow);

    if (!joinKey) {
      exportRowsWithoutKey += 1;
    }

    const eventRow = joinKey ? eventIndex.get(joinKey) : null;

    if (!eventRow) {
      unmatchedExportCount += 1;
    } else {
      matchedRows += 1;
    }

    const joinedRow = buildJoinedRow(exportRow, eventRow);

    if (Number.isFinite(joinedRow._latitude) && Number.isFinite(joinedRow._longitude)) {
      candidateMarkerRows += 1;
    } else {
      rowsMissingCoordinates += 1;
    }

    joined.push(joinedRow);
  }

  state.joinedRows = joined;
  state.lastLoadSummary = {
    ...state.lastLoadSummary,
    candidateMarkerRows,
    matchedRows,
    unmatchedExportRows: unmatchedExportCount,
    eventRowsWithoutKey,
    exportRowsWithoutKey,
    rowsMissingCoordinates
  };

  setText(ui.joinedCount, String(joined.length));

  logDebug(
    [
      "Join complete.",
      `joined=${joined.length}`,
      `matched=${matchedRows}`,
      `unmatched_export=${unmatchedExportCount}`,
      `event_rows_without_key=${eventRowsWithoutKey}`,
      `export_rows_without_key=${exportRowsWithoutKey}`,
      `marker_candidates=${candidateMarkerRows}`,
      `missing_coordinates=${rowsMissingCoordinates}`
    ].join(" ")
  );
}

function buildJoinedRow(exportRow, eventRow) {
  const latitude = toNumber(
    exportRow.latitude ??
      exportRow.lat ??
      exportRow.y ??
      exportRow.decimal_latitude
  );

  const longitude = toNumber(
    exportRow.longitude ??
      exportRow.lng ??
      exportRow.lon ??
      exportRow.x ??
      exportRow.decimal_longitude
  );

  const title =
    firstNonEmpty(
      exportRow.title,
      exportRow.summary,
      exportRow.customer_name,
      exportRow.name,
      eventRow?.title,
      eventRow?.summary,
      eventRow?.name
    ) || "Record";

  return {
    ...eventRow,
    ...exportRow,
    _joined: Boolean(eventRow),
    _joinKey: getJoinKey(exportRow) || getJoinKey(eventRow),
    _title: title,
    _latitude: latitude,
    _longitude: longitude
  };
}

function deriveRows() {
  state.derivedRows = state.joinedRows.map((row) => {
    const addressText = composeAddress(row);

    const rawOrganizer = firstNonEmpty(
      row.calendar_id,
      row.organizer,
      row.creator,
      row.created_by,
      row.owner,
      row.assigned_to
    );

    const organizerText = getOrganizerLabel(rawOrganizer);
    const notesText = firstNonEmpty(row.notes, row.description, row.memo);

    const parsedDate = parsePossibleDate(
      firstNonEmpty(
        row.date,
        row.start_date,
        row.event_date,
        row.start_time,
        row.created_at,
        row.updated_at
      )
    );

    const dateDisplay = getDisplayDate(row, parsedDate);
    const derivedYear = parsedDate ? String(parsedDate.getFullYear()) : "";

    const dayInfo = getDayInfo(parsedDate);

    const keywordBlob = normalizeText(
      [
        row._title,
        addressText,
        organizerText,
        rawOrganizer,
        notesText,
        row.row_id,
        row.source_row_id,
        row.event_id,
        row.calendar_id
      ]
        .filter(Boolean)
        .join(" ")
    );

    return {
      ...row,
      _addressText: addressText,
      _organizerText: organizerText || "Unknown",
      _organizerKey: normalizeText(organizerText) || "unknown",
      _organizerRaw: rawOrganizer || "",
      _notesText: notesText,
      _dateDisplay: dateDisplay,
      _parsedDate: parsedDate,
      _year: derivedYear,
      _dayKey: dayInfo.key,
      _dayLabel: dayInfo.label,
      _dayIndex: dayInfo.index,
      _dayColor: dayInfo.color,
      _hasCoordinates:
        Number.isFinite(row._latitude) && Number.isFinite(row._longitude),
      _keywordBlob: keywordBlob
    };
  });

  logDebug(`Derived runtime rows: ${state.derivedRows.length}`);
}

function getOrganizerLabel(rawValue) {
  const normalizedRaw = String(rawValue || "").trim();
  if (!normalizedRaw) {
    return "Unknown";
  }

  return CONFIG.organizerAliases[normalizedRaw] || normalizedRaw;
}

function getDayInfo(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { key: "", label: "", index: -1, color: "#2563eb" };
  }

  const dayIndex = date.getDay();
  const keys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  const key = keys[dayIndex];
  const meta = CONFIG.dayMeta[key];

  return {
    key,
    label: meta?.label || "",
    index: meta?.index ?? dayIndex,
    color: meta?.color || "#2563eb"
  };
}

function populateFilterOptions() {
  renderOrganizerToggles(
    collectUniqueOptions(state.derivedRows, "_organizerKey", "_organizerText", {
      excludeKeys: ["unknown"]
    })
  );

  renderDayToggles(collectDayOptions(state.derivedRows));

  populateSelect(
    ui.yearFilter,
    "All years",
    collectYearOptions(state.derivedRows)
  );

  resetFilterControls();

  logDebug(
    [
      "Filter options populated.",
      `organizers=${collectUniqueOptions(state.derivedRows, "_organizerKey", "_organizerText", { excludeKeys: ["unknown"] }).length}`,
      `days=${collectDayOptions(state.derivedRows).length}`,
      `years=${Math.max(ui.yearFilter?.options.length - 1 || 0, 0)}`
    ].join(" ")
  );
}

function renderOrganizerToggles(options) {
  if (!ui.organizerToggleGroup) {
    return;
  }

  ui.organizerToggleGroup.innerHTML = "";

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toggle-chip";
    button.dataset.value = option.value;
    button.textContent = option.label;
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      toggleArrayValue(state.filters.organizers, option.value);
      syncToggleGroupState(ui.organizerToggleGroup, state.filters.organizers);
      applyFiltersAndRender();
    });

    ui.organizerToggleGroup.appendChild(button);
  }

  syncToggleGroupState(ui.organizerToggleGroup, state.filters.organizers);
}

function renderDayToggles(options) {
  if (!ui.dayToggleGroup) {
    return;
  }

  ui.dayToggleGroup.innerHTML = "";

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toggle-chip toggle-chip--day";
    button.dataset.value = option.value;
    button.dataset.dayKey = option.value;
    button.textContent = option.label;
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--day-color", option.color || "#2563eb");

    button.addEventListener("click", () => {
      toggleArrayValue(state.filters.days, option.value);
      syncToggleGroupState(ui.dayToggleGroup, state.filters.days);
      applyFiltersAndRender();
    });

    ui.dayToggleGroup.appendChild(button);
  }

  syncToggleGroupState(ui.dayToggleGroup, state.filters.days);
}

function syncToggleGroupState(container, selectedValues) {
  if (!container) {
    return;
  }

  const selected = new Set(selectedValues);

  for (const button of container.querySelectorAll("[data-value]")) {
    const isSelected = selected.has(button.dataset.value);
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function applyFiltersAndRender(options = {}) {
  const { fitToVisible = false } = options;

  const candidateRows = state.derivedRows.filter((row) => row._hasCoordinates);
  const populationRows = candidateRows.filter(matchesPopulationFilters);
  const filteredRows = populationRows.filter(matchesKeywordFilter);

  updateBoundaryCounts(populationRows);
  refreshBoundaryStyles();

  let visibleRows = filteredRows;

  if (state.selectedBoundaryFeature) {
    visibleRows = filteredRows.filter((row) =>
      pointInFeature([row._longitude, row._latitude], state.selectedBoundaryFeature)
    );
  }

  state.populationRows = populationRows;
  state.filteredRows = filteredRows;
  state.visibleRows = visibleRows;

  state.lastLoadSummary = {
    ...state.lastLoadSummary,
    populationRows: populationRows.length,
    filteredRows: filteredRows.length,
    boundaryMatchedRows: visibleRows.length,
    visibleRows: visibleRows.length
  };

  renderMarkers(visibleRows, { fitToVisible });
  updateSummaryUi();

  logDebug(
    [
      "Filter pass complete.",
      `candidate=${candidateRows.length}`,
      `population=${populationRows.length}`,
      `after_keyword=${filteredRows.length}`,
      `visible=${visibleRows.length}`,
      `boundary=${state.selectedBoundaryFeature ? getBoundaryName(state.selectedBoundaryFeature) || "selected" : "none"}`
    ].join(" ")
  );
}

function matchesPopulationFilters(row) {
  if (!hasPopulationSelection()) {
    return false;
  }

  if (
    state.filters.organizers.length > 0 &&
    !state.filters.organizers.includes(row._organizerKey)
  ) {
    return false;
  }

  if (state.filters.days.length > 0 && !state.filters.days.includes(row._dayKey)) {
    return false;
  }

  if (state.filters.year !== "all" && row._year !== state.filters.year) {
    return false;
  }

  return true;
}

function matchesKeywordFilter(row) {
  const keyword = normalizeText(state.filters.keyword);

  if (keyword && !row._keywordBlob.includes(keyword)) {
    return false;
  }

  return true;
}

function hasPopulationSelection() {
  return (
    state.filters.organizers.length > 0 ||
    state.filters.days.length > 0 ||
    state.filters.year !== "all"
  );
}

function updateBoundaryCounts(rows) {
  const counts = {};

  if (state.boundariesGeojson?.features?.length) {
    for (const feature of state.boundariesGeojson.features) {
      const boundaryKey = getBoundaryKey(feature);
      counts[boundaryKey] = 0;
    }
  }

  if (!rows.length || !state.boundariesGeojson?.features?.length) {
    state.boundaryCounts = counts;
    return;
  }

  for (const row of rows) {
    const point = [row._longitude, row._latitude];

    for (const feature of state.boundariesGeojson.features) {
      if (pointInFeature(point, feature)) {
        const boundaryKey = getBoundaryKey(feature);
        counts[boundaryKey] = (counts[boundaryKey] || 0) + 1;
      }
    }
  }

  state.boundaryCounts = counts;
}

function refreshBoundaryStyles() {
  if (!state.boundaryLayer) {
    return;
  }

  state.boundaryLayer.eachLayer((layer) => {
    const feature = layer.feature;
    if (!feature) {
      return;
    }
    layer.setStyle(getBoundaryStyle(feature, false));
  });
}

function renderMarkers(rowsToRender, options = {}) {
  const { fitToVisible = false } = options;

  state.markerLayer.clearLayers();

  for (const row of rowsToRender) {
    const markerColor = row._dayColor || "#2563eb";

    const marker = L.circleMarker([row._latitude, row._longitude], {
      radius: CONFIG.markerRadius,
      weight: 1,
      opacity: 1,
      color: markerColor,
      fillColor: markerColor,
      fillOpacity: 0.82
    });

    marker.bindPopup(buildPopupHtml(row));
    marker.addTo(state.markerLayer);
  }

  setText(ui.visibleMarkerCount, String(rowsToRender.length));

  if (fitToVisible && rowsToRender.length > 0 && !state.selectedBoundaryFeature) {
    const group = L.featureGroup(
      rowsToRender.map((row) => L.marker([row._latitude, row._longitude]))
    );
    tryFitMapToLayer(group, CONFIG.fitBoundsPaddingDefault);
  } else if (state.derivedRows.filter((row) => row._hasCoordinates).length === 0) {
    logDebug("No marker candidates found. Check export CSV latitude/longitude fields.");
  } else if (!hasPopulationSelection()) {
    logDebug("Population gate active. No markers shown until organizer, day, or year is selected.");
  } else if (state.selectedBoundaryFeature && rowsToRender.length === 0) {
    logDebug("Population-matched rows exist, but none remain inside the selected boundary and keyword filter.");
  } else if (!state.selectedBoundaryFeature && rowsToRender.length === 0) {
    logDebug("No rows remain after the current population and keyword filters.");
  }
}

function buildPopupHtml(row) {
  const boundaryName = state.selectedBoundaryFeature
    ? getBoundaryName(state.selectedBoundaryFeature) || "Selected boundary"
    : "None";

  const rowId = row.row_id || row.source_row_id || "—";
  const eventId = row.event_id || "—";
  const calendarId = row.calendar_id || "—";
  const organizerText = row._organizerText || "—";
  const dateText = row._dateDisplay || "—";
  const dayText = row._dayLabel || "—";
  const addressText = row._addressText || "—";
  const notesText = row._notesText || "";
  const joinText = row._joined ? "Yes" : "No";

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(row._title || "Record")}</h3>
        <p class="popup-meta"><span class="popup-label">Date:</span> ${escapeHtml(dateText)}</p>
        <p class="popup-meta"><span class="popup-label">Day:</span> ${escapeHtml(dayText)}</p>
        <p class="popup-meta"><span class="popup-label">Organizer:</span> ${escapeHtml(organizerText)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(addressText)}</p>
        ${
          notesText
            ? `<p class="popup-notes"><span class="popup-label">Notes:</span> ${escapeHtml(notesText)}</p>`
            : ""
        }
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Row ID:</span> ${escapeHtml(rowId)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Event ID:</span> ${escapeHtml(eventId)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Calendar ID:</span> ${escapeHtml(calendarId)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Latitude:</span> ${escapeHtml(formatCoordinate(row._latitude))}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Longitude:</span> ${escapeHtml(formatCoordinate(row._longitude))}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Joined:</span> ${escapeHtml(joinText)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary filter:</span> ${escapeHtml(boundaryName)}</p>
      </div>
    </div>
  `;
}

function updateSummaryUi() {
  if (state.manifest?.updated_at) {
    setText(ui.updatedAt, formatTimestamp(state.manifest.updated_at));
  }

  const candidateCount = state.derivedRows.filter((row) => row._hasCoordinates).length;
  const filteredCount = state.filteredRows.length;
  const visibleCount = state.visibleRows.length;
  const boundaryCount = state.selectedBoundaryFeature ? visibleCount : filteredCount;

  setText(ui.candidateMarkerCount, String(candidateCount));
  setText(ui.filteredRowCount, String(filteredCount));
  setText(ui.boundaryMatchedCount, String(boundaryCount));
  setText(ui.visibleMarkerCount, String(visibleCount));
  setText(ui.joinedCount, String(state.joinedRows.length));

  setText(
    ui.resultsMessage,
    buildResultsMessage(candidateCount, state.populationRows.length, filteredCount, visibleCount)
  );
}

function buildResultsMessage(candidateCount, populationCount, filteredCount, visibleCount) {
  const boundaryName = state.selectedBoundaryFeature
    ? getBoundaryName(state.selectedBoundaryFeature) || "selected boundary"
    : "";

  if (candidateCount === 0) {
    return "No coordinate-valid rows are currently available for mapping.";
  }

  if (!hasPopulationSelection()) {
    return "Select at least one organizer, weekday, or year to populate the map.";
  }

  if (populationCount === 0) {
    return "No rows match the current population filters.";
  }

  if (filteredCount === 0 && state.filters.keyword.trim()) {
    return "No population-matched rows also match the current keyword search.";
  }

  if (visibleCount === 0 && state.selectedBoundaryFeature) {
    return `No filtered rows fall inside ${boundaryName}.`;
  }

  if (state.selectedBoundaryFeature && state.filters.keyword.trim()) {
    return `Showing ${visibleCount} row(s) after population filters, keyword search, and boundary selection.`;
  }

  if (state.selectedBoundaryFeature) {
    return `Showing ${visibleCount} row(s) inside ${boundaryName}.`;
  }

  if (state.filters.keyword.trim()) {
    return `Showing ${visibleCount} row(s) after population filters and keyword search.`;
  }

  return `Showing ${visibleCount} row(s) from the selected population.`;
}

function finalizeAppStatus() {
  if (!CONFIG.supabaseBaseUrl) {
    setStatus("appStatus", "Shell only");
    return;
  }

  const {
    candidateMarkerRows,
    rowsMissingCoordinates,
    unmatchedExportRows
  } = state.lastLoadSummary;

  if (state.exportRows.length === 0) {
    setStatus("appStatus", "No export rows");
    return;
  }

  if (candidateMarkerRows === 0) {
    setStatus("appStatus", "No valid coordinates");
    logDebug(
      `Export rows loaded, but no valid coordinate pairs were found. rows_missing_coordinates=${rowsMissingCoordinates}`
    );
    return;
  }

  if (unmatchedExportRows > 0) {
    setStatus("appStatus", "Ready (partial join)");
    return;
  }

  setStatus("appStatus", "Ready");
}

function clearFilters(resetInputs = true) {
  state.filters = {
    keyword: "",
    organizers: [],
    days: [],
    year: "all"
  };

  if (resetInputs) {
    resetFilterControls();
    logDebug("Filters cleared.");
  }
}

function resetFilterControls() {
  if (ui.keywordInput) {
    ui.keywordInput.value = state.filters.keyword;
  }

  if (ui.yearFilter) {
    ui.yearFilter.value = state.filters.year;
  }

  syncToggleGroupState(ui.organizerToggleGroup, state.filters.organizers);
  syncToggleGroupState(ui.dayToggleGroup, state.filters.days);
}

function resetFilterOptions() {
  if (ui.organizerToggleGroup) {
    ui.organizerToggleGroup.innerHTML = "";
  }

  if (ui.dayToggleGroup) {
    ui.dayToggleGroup.innerHTML = "";
  }

  populateSelect(ui.yearFilter, "All years", []);
}

function populateSelect(selectElement, defaultLabel, options) {
  if (!selectElement) {
    return;
  }

  const currentValue = selectElement.value || "all";
  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = defaultLabel;
  selectElement.appendChild(defaultOption);

  for (const option of options) {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    selectElement.appendChild(optionElement);
  }

  selectElement.value = [...selectElement.options].some(
    (option) => option.value === currentValue
  )
    ? currentValue
    : "all";
}

function collectUniqueOptions(rows, keyField, labelField, options = {}) {
  const { excludeKeys = [] } = options;
  const map = new Map();

  for (const row of rows) {
    const key = row[keyField];
    const label = row[labelField];

    if (!key || !label || excludeKeys.includes(key)) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, label);
    }
  }

  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function collectDayOptions(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!row._dayKey || !row._dayLabel) {
      continue;
    }

    if (!map.has(row._dayKey)) {
      map.set(row._dayKey, {
        value: row._dayKey,
        label: row._dayLabel,
        index: row._dayIndex,
        color: row._dayColor
      });
    }
  }

  return [...map.values()].sort((a, b) => a.index - b.index);
}

function collectYearOptions(rows) {
  const years = new Set();

  for (const row of rows) {
    if (row._year) {
      years.add(row._year);
    }
  }

  return [...years]
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({ value: year, label: year }));
}

function getDisplayDate(row, parsedDate = null) {
  return (
    firstNonEmpty(
      row.date,
      row.start_date,
      row.event_date,
      row.start_time,
      row.end_time,
      formatDateFromObject(parsedDate || parsePossibleDate(row.date)),
      formatDateFromObject(parsePossibleDate(row.start_date)),
      formatDateFromObject(parsePossibleDate(row.event_date)),
      formatDateFromObject(parsePossibleDate(row.start_time))
    ) || "—"
  );
}

function parsePossibleDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateFromObject(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
}

function buildAssetUrl(path) {
  return `${CONFIG.supabaseBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function fetchJson(url) {
  const response = await fetch(withNoCacheStamp(url), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON (${response.status}) from ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(withNoCacheStamp(url), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch text (${response.status}) from ${url}`);
  }

  return response.text();
}

function withNoCacheStamp(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_ts=${Date.now()}`;
}

function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const normalized = csvText.replace(/^\uFEFF/, "");
  const rows = splitCsvLines(normalized);

  if (rows.length === 0) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map((header) => header.trim());
  const records = [];

  for (let i = 1; i < rows.length; i += 1) {
    const rawLine = rows[i];

    if (!rawLine.trim()) {
      continue;
    }

    const values = parseCsvLine(rawLine);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = (values[index] ?? "").trim();
    });

    records.push(record);
  }

  return records;
}

function splitCsvLines(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      current += char;

      if (inQuotes && next === '"') {
        current += next;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      lines.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function getJoinKey(row) {
  if (!row) {
    return "";
  }

  const parts = [
    row.row_id || row.source_row_id || "",
    row.event_id || "",
    row.calendar_id || ""
  ].map((value) => String(value).trim());

  const hasAny = parts.some(Boolean);
  return hasAny ? parts.join("|") : "";
}

function composeAddress(row) {
  const pieces = [
    row.address_raw,
    row.location,
    row.address,
    row.street_name_number,
    row.street,
    row.city,
    row.province,
    row.postal_code,
    row.postal
  ].filter(Boolean);

  return dedupeOrderedStrings(pieces).join(", ");
}

function dedupeOrderedStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = String(value).trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function getBoundaryName(feature) {
  if (!feature?.properties) {
    return "";
  }

  return (
    feature.properties.name ||
    feature.properties.NAME ||
    feature.properties.municipality ||
    feature.properties.MUNICIPALITY ||
    feature.properties.region ||
    feature.properties.REGION ||
    feature.properties.LEGAL_NAME ||
    ""
  );
}

function getBoundaryKey(feature) {
  if (!feature) {
    return "";
  }

  const props = feature.properties || {};

  return (
    String(
      props.id ||
        props.ID ||
        props.objectid ||
        props.OBJECTID ||
        props.munid ||
        props.MUNID ||
        getBoundaryName(feature)
    ).trim()
  );
}

function pointInFeature(point, feature) {
  const geometry = feature?.geometry;

  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygonCoords) =>
      pointInPolygon(point, polygonCoords)
    );
  }

  return false;
}

function pointInPolygon(point, polygonRings) {
  if (!Array.isArray(polygonRings) || polygonRings.length === 0) {
    return false;
  }

  const outerRing = polygonRings[0];
  const insideOuter = isPointInRing(point, outerRing);

  if (!insideOuter) {
    return false;
  }

  for (let i = 1; i < polygonRings.length; i += 1) {
    if (isPointInRing(point, polygonRings[i])) {
      return false;
    }
  }

  return true;
}

function isPointInRing(point, ring) {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function tryFitMapToLayer(layer, padding = CONFIG.fitBoundsPaddingDefault) {
  try {
    const bounds = layer?.getBounds?.();

    if (bounds && bounds.isValid()) {
      state.map.fitBounds(bounds, {
        padding
      });
    }
  } catch (error) {
    logDebug(`fitBounds skipped: ${error.message}`);
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const normalized = String(value).trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toggleArrayValue(array, value) {
  const index = array.indexOf(value);

  if (index >= 0) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }
}

function formatCoordinate(value) {
  return Number.isFinite(value) ? String(value) : "—";
}

function formatTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function setStatus(id, text) {
  const element = ui[id];

  if (element) {
    element.textContent = text;
  }
}

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function disableButton(element, disabled) {
  if (element) {
    element.disabled = disabled;
  }
}

function clearDebug() {
  if (ui.debugOutput) {
    ui.debugOutput.textContent = "";
  }
}

function logDebug(message) {
  if (!ui.debugOutput) {
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  ui.debugOutput.textContent += `[${timestamp}] ${message}\n`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}