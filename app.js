const CONFIG = {
  boundariesUrl: "./data/boundaries.geojson",
  originsUrl: "./data/origins.json",

  /*
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
  originMarkerRadius: 9,
  keywordDebounceMs: 180,

  popupEmptyValue: "—",
  unknownLabel: "Unknown",

  organizerAliases: {
    "e8gq6ptj73o1p36cm3cl6c42j4@group.calendar.google.com": "INSTALL",
    "bfqu2a3urejcnobl2p80tebo0g@group.calendar.google.com": "TEMPLATE"
  },

  originTypeMeta: {
    warehouse: {
      label: "Warehouse",
      color: "#0f766e",
      fillColor: "#14b8a6"
    },
    showroom: {
      label: "Showroom",
      color: "#7c3aed",
      fillColor: "#a78bfa"
    },
    office: {
      label: "Office",
      color: "#2563eb",
      fillColor: "#60a5fa"
    },
    supplier: {
      label: "Supplier",
      color: "#b45309",
      fillColor: "#f59e0b"
    },
    other: {
      label: "Other",
      color: "#475569",
      fillColor: "#94a3b8"
    }
  },

  dayMeta: {
    sunday: { index: 0, label: "Sun", color: "#dc2626" },
    monday: { index: 1, label: "Mon", color: "#ea580c" },
    tuesday: { index: 2, label: "Tue", color: "#ca8a04" },
    wednesday: { index: 3, label: "Wed", color: "#16a34a" },
    thursday: { index: 4, label: "Thu", color: "#0891b2" },
    friday: { index: 5, label: "Fri", color: "#2563eb" },
    saturday: { index: 6, label: "Sat", color: "#7c3aed" }
  },

  visitBucketMeta: Array.from({ length: 10 }, (_, index) => {
    const value = String(index + 1);
    return {
      value,
      label: `${value}x`,
      order: index + 1
    };
  }),

  timeWindowMeta: [
    { value: "all", label: "All", order: 0 },
    { value: "upcoming", label: "Upcoming", order: 1 },
    { value: "last_7_days", label: "Last 7d", order: 2 },
    { value: "last_30_days", label: "Last 30d", order: 3 }
  ]
};

const DEFAULT_FILTERS = Object.freeze({
  keyword: "",
  organizers: [],
  days: [],
  year: "all",
  visitBuckets: [],
  timeWindow: "all"
});

const state = {
  map: null,
  boundaryLayer: null,
  markerLayer: null,
  originMarkerLayer: null,

  boundariesGeojson: null,
  boundaryFeatureCache: [],
  boundaryLayerByKey: new Map(),
  selectedBoundaryFeature: null,
  selectedBoundaryLayer: null,

  manifest: null,
  eventsRows: [],
  exportRows: [],
  joinedRows: [],
  derivedRows: [],
  candidateRows: [],
  populationRows: [],
  filteredRows: [],
  visibleRows: [],

  originRows: [],
  visibleOriginRows: [],
  selectedOriginId: "",

  filters: cloneDefaultFilters(),

  boundaryCounts: {},
  siteStats: new Map(),

  isLoading: false,
  lastError: null,

  timeContext: createEmptyTimeContext(),

  lastLoadSummary: createEmptyLoadSummary()
};

const ui = {
  keywordDebounceTimer: null
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheUi();
  bindUi();
  initMap();

  setStatus("appStatus", "Running");
  logDebug("App initialized.");

  await loadApp();
}

/* ==========================================================================
   Initialization
   ========================================================================== */

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
  ui.visitToggleGroup = document.getElementById("visitToggleGroup");
  ui.timeToggleGroup = document.getElementById("timeToggleGroup");
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

    if (ui.keywordDebounceTimer) {
      clearTimeout(ui.keywordDebounceTimer);
    }

    ui.keywordDebounceTimer = setTimeout(() => {
      applyFiltersAndRender();
    }, CONFIG.keywordDebounceMs);
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
    zoomControl: true,
    preferCanvas: true
  }).setView(CONFIG.defaultMapCenter, CONFIG.defaultMapZoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
  state.originMarkerLayer = L.layerGroup().addTo(state.map);
}

/* ==========================================================================
   Load orchestration
   ========================================================================== */

async function loadApp() {
  if (state.isLoading) {
    logDebug("Load skipped: already in progress.");
    return;
  }

  state.isLoading = true;
  state.lastError = null;
  disableButton(ui.refreshButton, true);

  clearDebug();
  resetUiForLoad();
  resetRuntimeData();

  logDebug("Reload started.");
  logDebug(`Boundaries URL: ${CONFIG.boundariesUrl}`);
  logDebug(`Origins URL: ${CONFIG.originsUrl}`);
  logDebug(`Supabase base URL: ${CONFIG.supabaseBaseUrl || "[blank]"}`);

  try {
    await loadBoundaries();
    await loadOrigins();
    await loadRemoteData();
    setTimeContext();
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

  setText(ui.updatedAt, CONFIG.popupEmptyValue);
  setText(ui.joinedCount, "0");
  setText(ui.candidateMarkerCount, "0");
  setText(ui.filteredRowCount, "0");
  setText(ui.boundaryMatchedCount, "0");
  setText(ui.visibleMarkerCount, "0");
  setText(ui.selectedBoundaryName, "None");
  setText(ui.resultsMessage, "Loading live data...");
}

function resetRuntimeData() {
  state.manifest = null;
  state.eventsRows = [];
  state.exportRows = [];
  state.joinedRows = [];
  state.derivedRows = [];
  state.candidateRows = [];
  state.populationRows = [];
  state.filteredRows = [];
  state.visibleRows = [];

  state.originRows = [];
  state.visibleOriginRows = [];
  state.selectedOriginId = "";

  state.boundariesGeojson = null;
  state.boundaryFeatureCache = [];
  state.boundaryLayerByKey = new Map();
  state.selectedBoundaryFeature = null;
  state.selectedBoundaryLayer = null;

  state.boundaryCounts = {};
  state.siteStats = new Map();

  state.timeContext = createEmptyTimeContext();
  state.lastLoadSummary = createEmptyLoadSummary();

  clearFilters(false);
  resetFilterControls();
  resetFilterOptions();

  if (state.markerLayer) {
    state.markerLayer.clearLayers();
  }

  if (state.originMarkerLayer) {
    state.originMarkerLayer.clearLayers();
  }
}

function setTimeContext() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const last7Start = new Date(startOfToday);
  last7Start.setDate(last7Start.getDate() - 7);

  const last30Start = new Date(startOfToday);
  last30Start.setDate(last30Start.getDate() - 30);

  state.timeContext = {
    now,
    startOfToday,
    endOfToday,
    last7Start,
    last30Start
  };

  logDebug(
    [
      "Time context set.",
      `now=${now.toISOString()}`,
      `start_of_today=${startOfToday.toISOString()}`,
      `last_7_start=${last7Start.toISOString()}`,
      `last_30_start=${last30Start.toISOString()}`
    ].join(" ")
  );
}

async function loadBoundaries() {
  logDebug(`Loading boundaries from ${CONFIG.boundariesUrl}`);

  const response = await fetch(CONFIG.boundariesUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load boundaries GeoJSON (${response.status})`);
  }

  const geojson = await response.json();
  state.boundariesGeojson = geojson;
  state.boundaryFeatureCache = buildBoundaryFeatureCache(geojson);

  if (state.boundaryLayer) {
    state.map.removeLayer(state.boundaryLayer);
  }

  state.boundaryLayerByKey = new Map();

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

async function loadOrigins() {
  logDebug(`Loading origins from ${CONFIG.originsUrl}`);

  const response = await fetch(withNoCacheStamp(CONFIG.originsUrl), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load origins JSON (${response.status})`);
  }

  const rawOrigins = await response.json();
  validateOrigins(rawOrigins);

  state.originRows = rawOrigins.map((origin) => deriveOriginRow(origin));
  state.lastLoadSummary.originRows = state.originRows.length;

  const activeOrigins = state.originRows.filter((origin) => origin._isActive);
  const coordinateValidOrigins = activeOrigins.filter((origin) => origin._hasCoordinates);

  logDebug(
    [
      "Origins loaded.",
      `total=${state.originRows.length}`,
      `active=${activeOrigins.length}`,
      `coordinate_valid=${coordinateValidOrigins.length}`
    ].join(" ")
  );
}

async function loadRemoteData() {
  if (!CONFIG.supabaseBaseUrl) {
    setStatus("manifestStatus", "Not configured");
    setStatus("eventsStatus", "Not configured");
    setStatus("exportStatus", "Not configured");
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
  state.eventsRows = parseCsv(await fetchText(eventsUrl));
  setStatus("eventsStatus", `Loaded (${state.eventsRows.length})`);

  logDebug(`Fetching export CSV: ${exportUrl}`);
  state.exportRows = parseCsv(await fetchText(exportUrl));
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

function validateOrigins(origins) {
  if (!Array.isArray(origins)) {
    throw new Error("Origins data must be a JSON array.");
  }
}

/* ==========================================================================
   Join + derive
   ========================================================================== */

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

    if (joinedRow._hasCoordinates) {
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

  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

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
    _longitude: longitude,
    _hasCoordinates: hasCoordinates
  };
}

function deriveRows() {
  const baseRows = state.joinedRows.map((row) => deriveRow(row));

  enrichRowsWithBoundaryMembership(baseRows);
  enrichRowsWithVisitAnalytics(baseRows);
  enrichRowsWithKeywordBlobs(baseRows);
  enrichRowsWithNearestOrigins(baseRows);

  state.derivedRows = baseRows;
  state.candidateRows = baseRows.filter((row) => row._hasCoordinates);

  logDebug(`Derived runtime rows: ${state.derivedRows.length}`);
  logDebug(
    [
      "Derived caches ready.",
      `candidate_rows=${state.candidateRows.length}`,
      `distinct_sites=${state.lastLoadSummary.distinctSites}`,
      `rows_with_boundary=${state.lastLoadSummary.candidateRowsWithBoundary}`,
      `rows_without_boundary=${state.lastLoadSummary.candidateRowsWithoutBoundary}`
    ].join(" ")
  );
}

function deriveRow(row) {
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
  const timeInfo = getTimeInfo(parsedDate);

  return {
    ...row,
    _addressText: addressText,
    _organizerText: organizerText || CONFIG.unknownLabel,
    _organizerKey: normalizeText(organizerText) || "unknown",
    _organizerRaw: rawOrganizer || "",
    _notesText: notesText,

    _parsedDate: parsedDate,
    _dateDisplay: dateDisplay,
    _year: derivedYear,

    _dayKey: dayInfo.key,
    _dayLabel: dayInfo.label,
    _dayIndex: dayInfo.index,
    _dayColor: dayInfo.color,

    _siteKey: buildSiteKey(row),
    _visitCount: 0,
    _visitBucket: "",
    _visitBucketLabel: "",

    _boundaryKey: "",
    _boundaryName: "",

    _nearestOriginId: "",
    _nearestOriginName: "",
    _nearestOriginType: "",
    _nearestOriginDistanceKm: null,

    _hasParsedDate: timeInfo.hasParsedDate,
    _isDateOnly: timeInfo.isDateOnly,
    _isUpcoming: timeInfo.isUpcoming,
    _daysFromToday: timeInfo.daysFromToday,
    _timeBucket: timeInfo.timeBucket,
    _timeBucketLabel: timeInfo.timeBucketLabel
  };
}

function deriveOriginRow(origin) {
  const latitude = toNumber(origin.latitude ?? origin.lat);
  const longitude = toNumber(origin.longitude ?? origin.lng ?? origin.lon);

  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const typeKey = normalizeText(origin.type) || "other";
  const meta = getOriginTypeMeta(typeKey);
  const isActive = origin.isActive !== false;

  const derived = {
    ...origin,
    _latitude: latitude,
    _longitude: longitude,
    _hasCoordinates: hasCoordinates,
    _isActive: isActive,
    _typeKey: typeKey,
    _typeLabel: meta.label,
    _boundaryKey: "",
    _boundaryName: ""
  };

  if (hasCoordinates) {
    const feature = findContainingBoundaryFeature([longitude, latitude]);
    if (feature) {
      derived._boundaryKey = getBoundaryKey(feature);
      derived._boundaryName = getBoundaryName(feature) || "";
    }
  }

  return derived;
}

function getTimeInfo(parsedDate) {
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return {
      hasParsedDate: false,
      isDateOnly: false,
      isUpcoming: false,
      daysFromToday: null,
      timeBucket: "",
      timeBucketLabel: ""
    };
  }

  const { now, startOfToday, endOfToday, last7Start, last30Start } = state.timeContext;

  const isDateOnly =
    parsedDate.getHours() === 0 &&
    parsedDate.getMinutes() === 0 &&
    parsedDate.getSeconds() === 0 &&
    parsedDate.getMilliseconds() === 0;

  const compareAnchor = isDateOnly ? startOfToday : now;
  const isUpcoming = parsedDate.getTime() >= compareAnchor.getTime();

  const eventDay = new Date(parsedDate);
  eventDay.setHours(0, 0, 0, 0);

  const daysFromToday = Math.round(
    (eventDay.getTime() - startOfToday.getTime()) / 86400000
  );

  let timeBucket = "";

  if (isUpcoming) {
    timeBucket = "upcoming";
  } else if (
    parsedDate.getTime() >= last7Start.getTime() &&
    parsedDate.getTime() <= endOfToday.getTime()
  ) {
    timeBucket = "last_7_days";
  } else if (
    parsedDate.getTime() >= last30Start.getTime() &&
    parsedDate.getTime() <= endOfToday.getTime()
  ) {
    timeBucket = "last_30_days";
  }

  return {
    hasParsedDate: true,
    isDateOnly,
    isUpcoming,
    daysFromToday,
    timeBucket,
    timeBucketLabel: getTimeWindowLabel(timeBucket)
  };
}

function enrichRowsWithBoundaryMembership(rows) {
  let withBoundary = 0;
  let withoutBoundary = 0;

  if (!state.boundaryFeatureCache.length) {
    for (const row of rows) {
      row._boundaryKey = "";
      row._boundaryName = "";
    }

    state.lastLoadSummary = {
      ...state.lastLoadSummary,
      candidateRowsWithBoundary: 0,
      candidateRowsWithoutBoundary: rows.filter((row) => row._hasCoordinates).length
    };
    return;
  }

  for (const row of rows) {
    if (!row._hasCoordinates) {
      row._boundaryKey = "";
      row._boundaryName = "";
      continue;
    }

    const feature = findContainingBoundaryFeature([row._longitude, row._latitude]);

    if (feature) {
      row._boundaryKey = getBoundaryKey(feature);
      row._boundaryName = getBoundaryName(feature) || "";
      withBoundary += 1;
    } else {
      row._boundaryKey = "";
      row._boundaryName = "";
      withoutBoundary += 1;
    }
  }

  state.lastLoadSummary = {
    ...state.lastLoadSummary,
    candidateRowsWithBoundary: withBoundary,
    candidateRowsWithoutBoundary: withoutBoundary
  };
}

function enrichRowsWithVisitAnalytics(rows) {
  const stats = new Map();

  for (const row of rows) {
    if (!row._siteKey) {
      continue;
    }
    stats.set(row._siteKey, (stats.get(row._siteKey) || 0) + 1);
  }

  state.siteStats = stats;

  for (const row of rows) {
    const visitCount = row._siteKey ? stats.get(row._siteKey) || 0 : 0;
    const visitBucket = visitCount > 0 ? getVisitBucket(visitCount) : "";

    row._visitCount = visitCount;
    row._visitBucket = visitBucket;
    row._visitBucketLabel = getVisitBucketLabel(visitBucket);
  }

  state.lastLoadSummary = {
    ...state.lastLoadSummary,
    distinctSites: stats.size
  };
}

function enrichRowsWithKeywordBlobs(rows) {
  for (const row of rows) {
    row._keywordBlob = normalizeText(
      [
        row._title,
        row._addressText,
        row._organizerText,
        row._organizerRaw,
        row._notesText,
        row.row_id,
        row.source_row_id,
        row.event_id,
        row.calendar_id,
        row._boundaryName,
        row._dayLabel,
        row._year,
        row._visitBucketLabel,
        row._visitCount,
        row._timeBucketLabel,
        row._nearestOriginName,
        row._nearestOriginType
      ]
        .filter(Boolean)
        .join(" ")
    );
  }
}

function enrichRowsWithNearestOrigins(rows) {
  const originCandidates = state.originRows.filter(
    (origin) => origin._isActive && origin._hasCoordinates
  );

  if (originCandidates.length === 0) {
    return;
  }

  for (const row of rows) {
    if (!row._hasCoordinates) {
      continue;
    }

    let bestOrigin = null;
    let bestDistance = Infinity;

    for (const origin of originCandidates) {
      const distanceKm = getDistanceKm(
        row._latitude,
        row._longitude,
        origin._latitude,
        origin._longitude
      );

      if (distanceKm < bestDistance) {
        bestDistance = distanceKm;
        bestOrigin = origin;
      }
    }

    if (bestOrigin) {
      row._nearestOriginId = bestOrigin.id || "";
      row._nearestOriginName = bestOrigin.name || "";
      row._nearestOriginType = bestOrigin._typeLabel || "";
      row._nearestOriginDistanceKm = bestDistance;
    }
  }
}

/* ==========================================================================
   Boundary logic
   ========================================================================== */

function buildBoundaryFeatureCache(geojson) {
  if (!Array.isArray(geojson?.features)) {
    return [];
  }

  return geojson.features.map((feature) => ({
    feature,
    key: getBoundaryKey(feature),
    bbox: getFeatureBoundingBox(feature)
  }));
}

function onEachBoundaryFeature(feature, layer) {
  const boundaryKey = getBoundaryKey(feature);
  state.boundaryLayerByKey.set(boundaryKey, layer);

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

  layer.bindTooltip(getBoundaryName(feature) || "Boundary", { sticky: true });
}

function selectBoundary(feature, layer) {
  clearBoundarySelection(false);

  state.selectedBoundaryFeature = feature;
  state.selectedBoundaryLayer = layer;

  layer.setStyle(getBoundaryStyle(feature, false));
  setText(ui.selectedBoundaryName, getBoundaryName(feature) || "Boundary");
  logDebug(`Boundary selected: ${getBoundaryName(feature) || "Boundary"}`);
}

function clearBoundarySelection(resetText = true) {
  state.selectedBoundaryFeature = null;
  state.selectedBoundaryLayer = null;

  refreshBoundaryStyles();

  if (resetText) {
    setText(ui.selectedBoundaryName, "None");
    logDebug("Boundary selection cleared.");
  }
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

function refreshBoundaryStyles() {
  if (!state.boundaryLayer) {
    return;
  }

  state.boundaryLayer.eachLayer((layer) => {
    if (layer.feature) {
      layer.setStyle(getBoundaryStyle(layer.feature, false));
    }
  });
}

function updateBoundaryCounts(rows) {
  const counts = {};

  if (state.boundariesGeojson?.features?.length) {
    for (const feature of state.boundariesGeojson.features) {
      counts[getBoundaryKey(feature)] = 0;
    }
  }

  for (const row of rows) {
    if (row._boundaryKey) {
      counts[row._boundaryKey] = (counts[row._boundaryKey] || 0) + 1;
    }
  }

  state.boundaryCounts = counts;
}

function findContainingBoundaryFeature(point) {
  if (!state.boundaryFeatureCache.length) {
    return null;
  }

  for (const item of state.boundaryFeatureCache) {
    if (item.bbox && !pointInBoundingBox(point, item.bbox)) {
      continue;
    }
    if (pointInFeature(point, item.feature)) {
      return item.feature;
    }
  }

  return null;
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
  if (!isPointInRing(point, outerRing)) {
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

function getFeatureBoundingBox(feature) {
  const geometry = feature?.geometry;
  if (!geometry?.coordinates) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (coords) => {
    if (!Array.isArray(coords)) {
      return;
    }

    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }

    for (const child of coords) {
      visit(child);
    }
  };

  visit(geometry.coordinates);

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return [minX, minY, maxX, maxY];
}

function pointInBoundingBox(point, bbox) {
  const [x, y] = point;
  const [minX, minY, maxX, maxY] = bbox;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
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
  return String(
    props.id ||
      props.ID ||
      props.objectid ||
      props.OBJECTID ||
      props.munid ||
      props.MUNID ||
      getBoundaryName(feature)
  ).trim();
}

/* ==========================================================================
   Filter options + filter application
   ========================================================================== */

function populateFilterOptions() {
  const organizerOptions = collectUniqueOptions(
    state.candidateRows,
    "_organizerKey",
    "_organizerText",
    { excludeKeys: ["unknown"] }
  );

  const dayOptions = collectDayOptions(state.candidateRows);
  const yearOptions = collectYearOptions(state.candidateRows);
  const timeOptions = collectTimeOptions(state.candidateRows);
  const visitOptionStats = collectVisitOptionStats(state.candidateRows);

  renderOrganizerToggles(organizerOptions);
  renderDayToggles(dayOptions);
  renderVisitToggles(visitOptionStats);
  renderTimeToggles(timeOptions);
  populateSelect(ui.yearFilter, "All years", yearOptions);
  resetFilterControls();

  logDebug(
    [
      "Filter options populated.",
      `organizers=${organizerOptions.length}`,
      `days=${dayOptions.length}`,
      `visit_buckets=${visitOptionStats.length}`,
      `time_windows=${timeOptions.length}`,
      `years=${yearOptions.length}`
    ].join(" ")
  );
}

function renderOrganizerToggles(options) {
  renderMultiToggleGroup({
    container: ui.organizerToggleGroup,
    options,
    className: "toggle-chip",
    isSelected: (value) => state.filters.organizers.includes(value),
    onToggle: (value) => {
      toggleArrayValue(state.filters.organizers, value);
      applyFiltersAndRender();
    }
  });
}

function renderDayToggles(options) {
  if (!ui.dayToggleGroup) {
    return;
  }

  ui.dayToggleGroup.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const option of options) {
    const button = createToggleButton({
      className: "toggle-chip toggle-chip--day",
      value: option.value,
      label: option.label,
      isActive: state.filters.days.includes(option.value)
    });

    button.dataset.dayKey = option.value;
    button.style.setProperty("--day-color", option.color || "#2563eb");

    button.addEventListener("click", () => {
      toggleArrayValue(state.filters.days, option.value);
      applyFiltersAndRender();
    });

    fragment.appendChild(button);
  }

  ui.dayToggleGroup.appendChild(fragment);
  syncToggleGroupState(ui.dayToggleGroup, state.filters.days);
}

function renderVisitToggles(options) {
  if (!ui.visitToggleGroup) {
    return;
  }

  ui.visitToggleGroup.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const option of options) {
    const button = createToggleButton({
      className: "toggle-chip toggle-chip--visit",
      value: option.value,
      label: option.label,
      isActive: state.filters.visitBuckets.includes(option.value)
    });

    button.disabled = !option.isAvailable;
    button.dataset.available = String(option.isAvailable);
    button.title = option.isAvailable
      ? `${option.count} row(s) currently match ${option.label}`
      : `No rows currently match ${option.label}`;

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      toggleArrayValue(state.filters.visitBuckets, option.value);
      applyFiltersAndRender();
    });

    fragment.appendChild(button);
  }

  ui.visitToggleGroup.appendChild(fragment);
  updateVisitToggleAvailability(options);
  syncToggleGroupState(ui.visitToggleGroup, state.filters.visitBuckets);
}

function renderTimeToggles(options) {
  renderSingleToggleGroup({
    container: ui.timeToggleGroup,
    options,
    className: "toggle-chip",
    selectedValue: state.filters.timeWindow,
    onToggle: (value) => {
      state.filters.timeWindow =
        state.filters.timeWindow === value ? "all" : value;
      applyFiltersAndRender();
    }
  });
}

function renderMultiToggleGroup({
  container,
  options,
  className,
  isSelected,
  onToggle
}) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const option of options) {
    const button = createToggleButton({
      className,
      value: option.value,
      label: option.label,
      isActive: isSelected(option.value)
    });

    button.addEventListener("click", () => {
      onToggle(option.value);
    });

    fragment.appendChild(button);
  }

  container.appendChild(fragment);
}

function renderSingleToggleGroup({
  container,
  options,
  className,
  selectedValue,
  onToggle
}) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const option of options) {
    const button = createToggleButton({
      className,
      value: option.value,
      label: option.label,
      isActive: selectedValue === option.value
    });

    button.addEventListener("click", () => {
      onToggle(option.value);
    });

    fragment.appendChild(button);
  }

  container.appendChild(fragment);
  syncSingleToggleGroupState(container, selectedValue);
}

function createToggleButton({ className, value, label, isActive = false }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.value = value;
  button.textContent = label;
  button.classList.toggle("is-active", isActive);
  button.setAttribute("aria-pressed", String(isActive));
  return button;
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

function syncSingleToggleGroupState(container, selectedValue) {
  if (!container) {
    return;
  }

  for (const button of container.querySelectorAll("[data-value]")) {
    const isSelected = button.dataset.value === selectedValue;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function updateVisitToggleAvailability(options) {
  if (!ui.visitToggleGroup) {
    return;
  }

  const optionMap = new Map(options.map((item) => [item.value, item]));

  for (const button of ui.visitToggleGroup.querySelectorAll("[data-value]")) {
    const item = optionMap.get(button.dataset.value);
    const isAvailable = Boolean(item?.isAvailable);
    const count = item?.count || 0;
    const label = item?.label || button.textContent;

    button.disabled = !isAvailable;
    button.dataset.available = String(isAvailable);
    button.classList.toggle("is-available", isAvailable);
    button.classList.toggle("is-empty", !isAvailable);
    button.title = isAvailable
      ? `${count} row(s) currently match ${label}`
      : `No rows currently match ${label}`;
  }
}

function pruneUnavailableVisitSelections(options) {
  const availableValues = new Set(
    options.filter((item) => item.isAvailable).map((item) => item.value)
  );

  const nextSelected = state.filters.visitBuckets.filter((value) =>
    availableValues.has(value)
  );

  if (nextSelected.length !== state.filters.visitBuckets.length) {
    state.filters.visitBuckets = nextSelected;
    syncToggleGroupState(ui.visitToggleGroup, state.filters.visitBuckets);
    logDebug(
      "Unavailable visit selections were cleared to match the active filter context."
    );
  }
}

function applyFiltersAndRender(options = {}) {
  const { fitToVisible = false } = options;

  const visitOptionStats = collectVisitOptionStats(state.candidateRows);
  pruneUnavailableVisitSelections(visitOptionStats);

  const populationRows = state.candidateRows.filter((row) =>
    matchesPopulationFilters(row)
  );
  const filteredRows = populationRows.filter(matchesKeywordFilter);

  updateBoundaryCounts(populationRows);
  refreshBoundaryStyles();
  updateVisitToggleAvailability(visitOptionStats);

  let visibleRows = filteredRows;
  if (state.selectedBoundaryFeature) {
    const selectedBoundaryKey = getBoundaryKey(state.selectedBoundaryFeature);
    visibleRows = filteredRows.filter((row) => row._boundaryKey === selectedBoundaryKey);
  }

  const visibleOriginRows = getVisibleOriginRows();

  state.populationRows = populationRows;
  state.filteredRows = filteredRows;
  state.visibleRows = visibleRows;
  state.visibleOriginRows = visibleOriginRows;

  state.lastLoadSummary = {
    ...state.lastLoadSummary,
    populationRows: populationRows.length,
    filteredRows: filteredRows.length,
    boundaryMatchedRows: visibleRows.length,
    visibleRows: visibleRows.length,
    visibleOriginRows: visibleOriginRows.length
  };

  renderMarkers(visibleRows, { fitToVisible });
  renderOriginMarkers(visibleOriginRows);
  updateSummaryUi();
  syncFilterControls();

  logDebug(
    [
      "Filter pass complete.",
      `candidate=${state.candidateRows.length}`,
      `population=${populationRows.length}`,
      `after_keyword=${filteredRows.length}`,
      `visible=${visibleRows.length}`,
      `visible_origins=${visibleOriginRows.length}`,
      `selected_origin=${state.selectedOriginId || "none"}`,
      `time_window=${state.filters.timeWindow}`,
      `boundary=${
        state.selectedBoundaryFeature
          ? getBoundaryName(state.selectedBoundaryFeature) || "selected"
          : "none"
      }`
    ].join(" ")
  );
}

function getVisibleOriginRows() {
  let rows = state.originRows.filter((origin) => origin._isActive && origin._hasCoordinates);

  if (state.selectedBoundaryFeature) {
    const selectedBoundaryKey = getBoundaryKey(state.selectedBoundaryFeature);
    rows = rows.filter((origin) => origin._boundaryKey === selectedBoundaryKey);
  }

  const selectedOrigin = getSelectedOrigin();
  if (
    selectedOrigin &&
    selectedOrigin._hasCoordinates &&
    !rows.some((origin) => origin.id === selectedOrigin.id)
  ) {
    rows = [...rows, selectedOrigin];
  }

  return rows;
}

function matchesPopulationFilters(row, options = {}) {
  const { ignoreVisitBuckets = false, allowNoSelection = false } = options;

  if (!allowNoSelection && !hasPopulationSelection()) {
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

  if (
    !ignoreVisitBuckets &&
    state.filters.visitBuckets.length > 0 &&
    !state.filters.visitBuckets.includes(row._visitBucket)
  ) {
    return false;
  }

  if (state.filters.year !== "all" && row._year !== state.filters.year) {
    return false;
  }

  if (!matchesTimeWindow(row, state.filters.timeWindow)) {
    return false;
  }

  return true;
}

function matchesTimeWindow(row, timeWindow) {
  if (timeWindow === "all") {
    return true;
  }

  if (!row._hasParsedDate || !(row._parsedDate instanceof Date)) {
    return false;
  }

  const dateMs = row._parsedDate.getTime();
  const { now, startOfToday, endOfToday, last7Start, last30Start } = state.timeContext;

  if (timeWindow === "upcoming") {
    const threshold = row._isDateOnly ? startOfToday.getTime() : now.getTime();
    return dateMs >= threshold;
  }

  if (timeWindow === "last_7_days") {
    return (
      dateMs >= last7Start.getTime() &&
      dateMs <= endOfToday.getTime() &&
      !row._isUpcoming
    );
  }

  if (timeWindow === "last_30_days") {
    return (
      dateMs >= last30Start.getTime() &&
      dateMs <= endOfToday.getTime() &&
      !row._isUpcoming
    );
  }

  return true;
}

function matchesKeywordFilter(row) {
  const keyword = normalizeText(state.filters.keyword);
  if (!keyword) {
    return true;
  }
  return row._keywordBlob.includes(keyword);
}

function hasPopulationSelection() {
  return (
    state.filters.organizers.length > 0 ||
    state.filters.days.length > 0 ||
    state.filters.visitBuckets.length > 0 ||
    state.filters.year !== "all" ||
    state.filters.timeWindow !== "all"
  );
}

/* ==========================================================================
   Marker rendering + popups
   ========================================================================== */

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
    return;
  }

  if (state.candidateRows.length === 0) {
    logDebug("No marker candidates found. Check export CSV latitude/longitude fields.");
    return;
  }

  if (!hasPopulationSelection()) {
    logDebug(
      "Population gate active. No job markers shown until organizer, day, year, visit count, or time window is selected."
    );
    return;
  }

  if (state.selectedBoundaryFeature && rowsToRender.length === 0) {
    logDebug(
      "Population-matched rows exist, but none remain inside the selected boundary and keyword filter."
    );
    return;
  }

  if (!state.selectedBoundaryFeature && rowsToRender.length === 0) {
    logDebug("No rows remain after the current population and keyword filters.");
  }
}

function renderOriginMarkers(originsToRender) {
  state.originMarkerLayer.clearLayers();

  for (const origin of originsToRender) {
    const isSelected = origin.id === state.selectedOriginId;
    const style = getOriginMarkerStyle(origin, isSelected);

    const marker = L.circleMarker([origin._latitude, origin._longitude], style);

    marker.bindPopup(buildOriginPopupHtml(origin));

    marker.on("click", () => {
      if (state.selectedOriginId === origin.id) {
        state.selectedOriginId = "";
        renderOriginMarkers(state.visibleOriginRows);
        logDebug(`Origin selection cleared: ${origin.name || origin.id}`);
        return;
      }

      state.selectedOriginId = origin.id;
      renderOriginMarkers(state.visibleOriginRows);
      logDebug(`Origin selected: ${origin.name || origin.id}`);
    });

    marker.addTo(state.originMarkerLayer);
  }
}

function getOriginMarkerStyle(origin, isSelected = false) {
  const meta = getOriginTypeMeta(origin._typeKey);

  return {
    radius: isSelected ? CONFIG.originMarkerRadius + 2 : CONFIG.originMarkerRadius,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    color: isSelected ? "#111827" : meta.color,
    fillColor: meta.fillColor,
    fillOpacity: isSelected ? 0.95 : 0.88
  };
}

function buildPopupHtml(row) {
  const empty = CONFIG.popupEmptyValue;

  const activeBoundaryName = state.selectedBoundaryFeature
    ? getBoundaryName(state.selectedBoundaryFeature) || "Selected boundary"
    : "None";

  const rowId = row.row_id || row.source_row_id || empty;
  const eventId = row.event_id || empty;
  const calendarId = row.calendar_id || empty;
  const organizerText = row._organizerText || empty;
  const dateText = row._dateDisplay || empty;
  const dayText = row._dayLabel || empty;
  const addressText = row._addressText || empty;
  const notesText = row._notesText || "";
  const joinText = row._joined ? "Yes" : "No";
  const visitCountText = row._visitCount ? String(row._visitCount) : empty;
  const visitBucketText = row._visitBucketLabel || empty;
  const timeBucketText = row._timeBucketLabel || empty;
  const rowBoundaryName = row._boundaryName || "Unassigned";
  const nearestOriginText = row._nearestOriginName || empty;
  const nearestOriginTypeText = row._nearestOriginType || empty;
  const nearestOriginDistanceText =
    Number.isFinite(row._nearestOriginDistanceKm)
      ? `${formatNumber(row._nearestOriginDistanceKm, 1)} km`
      : empty;

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(row._title || "Record")}</h3>
        <p class="popup-meta"><span class="popup-label">Date:</span> ${escapeHtml(dateText)}</p>
        <p class="popup-meta"><span class="popup-label">Day:</span> ${escapeHtml(dayText)}</p>
        <p class="popup-meta"><span class="popup-label">Organizer:</span> ${escapeHtml(organizerText)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(addressText)}</p>
        <p class="popup-meta"><span class="popup-label">Time window:</span> ${escapeHtml(timeBucketText)}</p>
        <p class="popup-meta"><span class="popup-label">Visit count:</span> ${escapeHtml(visitCountText)}</p>
        <p class="popup-meta"><span class="popup-label">Visit bucket:</span> ${escapeHtml(visitBucketText)}</p>
        <p class="popup-meta"><span class="popup-label">Municipality:</span> ${escapeHtml(rowBoundaryName)}</p>
        <p class="popup-meta"><span class="popup-label">Nearest origin:</span> ${escapeHtml(nearestOriginText)}</p>
        <p class="popup-meta"><span class="popup-label">Nearest origin type:</span> ${escapeHtml(nearestOriginTypeText)}</p>
        <p class="popup-meta"><span class="popup-label">Nearest origin distance:</span> ${escapeHtml(nearestOriginDistanceText)}</p>
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
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Site key:</span> ${escapeHtml(row._siteKey || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary key:</span> ${escapeHtml(row._boundaryKey || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary filter:</span> ${escapeHtml(activeBoundaryName)}</p>
      </div>
    </div>
  `;
}

function buildOriginPopupHtml(origin) {
  const empty = CONFIG.popupEmptyValue;
  const isSelected = origin.id === state.selectedOriginId;

  return `
    <div>
      <div class="popup-section">
        <h3 class="popup-title">${escapeHtml(origin.name || "Origin")}</h3>
        <p class="popup-meta"><span class="popup-label">Type:</span> ${escapeHtml(origin._typeLabel || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(origin.address || empty)}</p>
        <p class="popup-meta"><span class="popup-label">Municipality:</span> ${escapeHtml(origin._boundaryName || "Unassigned")}</p>
        <p class="popup-meta"><span class="popup-label">Active:</span> ${escapeHtml(origin._isActive ? "Yes" : "No")}</p>
        <p class="popup-meta"><span class="popup-label">Selected:</span> ${escapeHtml(isSelected ? "Yes" : "No")}</p>
        ${
          origin.notes
            ? `<p class="popup-notes"><span class="popup-label">Notes:</span> ${escapeHtml(origin.notes)}</p>`
            : ""
        }
      </div>

      <div class="popup-section">
        <div class="popup-section-title">Technical details</div>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Origin ID:</span> ${escapeHtml(origin.id || empty)}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Latitude:</span> ${escapeHtml(formatCoordinate(origin._latitude))}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Longitude:</span> ${escapeHtml(formatCoordinate(origin._longitude))}</p>
        <p class="popup-meta popup-meta--muted"><span class="popup-label">Boundary key:</span> ${escapeHtml(origin._boundaryKey || empty)}</p>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Summary UI
   ========================================================================== */

function updateSummaryUi() {
  if (state.manifest?.updated_at) {
    setText(ui.updatedAt, formatTimestamp(state.manifest.updated_at));
  }

  const candidateCount = state.candidateRows.length;
  const filteredCount = state.filteredRows.length;
  const visibleCount = state.visibleRows.length;
  const boundaryCount = state.selectedBoundaryFeature ? visibleCount : filteredCount;
  const selectedOrigin = getSelectedOrigin();

  setText(ui.candidateMarkerCount, String(candidateCount));
  setText(ui.filteredRowCount, String(filteredCount));
  setText(ui.boundaryMatchedCount, String(boundaryCount));
  setText(ui.visibleMarkerCount, String(visibleCount));
  setText(ui.joinedCount, String(state.joinedRows.length));

  setText(
    ui.resultsMessage,
    buildResultsMessage(
      candidateCount,
      state.populationRows.length,
      filteredCount,
      visibleCount,
      state.visibleOriginRows.length,
      selectedOrigin
    )
  );
}

function buildResultsMessage(
  candidateCount,
  populationCount,
  filteredCount,
  visibleCount,
  visibleOriginCount,
  selectedOrigin
) {
  const boundaryName = state.selectedBoundaryFeature
    ? getBoundaryName(state.selectedBoundaryFeature) || "selected boundary"
    : "";

  if (candidateCount === 0) {
    return "No coordinate-valid rows are currently available for mapping.";
  }

  if (!hasPopulationSelection()) {
    const base = `Select at least one organizer, weekday, year, visit count, or time window to populate job markers. ${visibleOriginCount} origin marker(s) are loaded.`;
    if (selectedOrigin) {
      return `${base} Selected origin: ${selectedOrigin.name || selectedOrigin.id}.`;
    }
    return base;
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

  let message = "";

  if (state.selectedBoundaryFeature && state.filters.keyword.trim()) {
    message = `Showing ${visibleCount} row(s) after population filters, keyword search, and boundary selection.`;
  } else if (state.selectedBoundaryFeature) {
    message = `Showing ${visibleCount} row(s) inside ${boundaryName}.`;
  } else if (state.filters.keyword.trim()) {
    message = `Showing ${visibleCount} row(s) after population filters and keyword search.`;
  } else {
    message = `Showing ${visibleCount} row(s) from the selected population.`;
  }

  message += ` ${visibleOriginCount} origin marker(s) visible.`;

  if (selectedOrigin) {
    message += ` Selected origin: ${selectedOrigin.name || selectedOrigin.id}.`;
  }

  return message;
}

function finalizeAppStatus() {
  if (!CONFIG.supabaseBaseUrl) {
    setStatus("appStatus", "Shell only");
    return;
  }

  const { candidateMarkerRows, rowsMissingCoordinates, unmatchedExportRows } =
    state.lastLoadSummary;

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

/* ==========================================================================
   Filter control state
   ========================================================================== */

function clearFilters(resetInputs = true) {
  state.filters = cloneDefaultFilters();

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
  syncToggleGroupState(ui.visitToggleGroup, state.filters.visitBuckets);
  syncSingleToggleGroupState(ui.timeToggleGroup, state.filters.timeWindow);
}

function syncFilterControls() {
  resetFilterControls();
}

function resetFilterOptions() {
  if (ui.organizerToggleGroup) ui.organizerToggleGroup.innerHTML = "";
  if (ui.dayToggleGroup) ui.dayToggleGroup.innerHTML = "";
  if (ui.visitToggleGroup) ui.visitToggleGroup.innerHTML = "";
  if (ui.timeToggleGroup) ui.timeToggleGroup.innerHTML = "";
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

function collectVisitOptionStats(rows) {
  const stats = new Map();

  for (const meta of CONFIG.visitBucketMeta) {
    stats.set(meta.value, {
      value: meta.value,
      label: meta.label,
      order: meta.order,
      count: 0,
      isAvailable: false
    });
  }

  let baseRows = rows.filter((row) =>
    matchesPopulationFilters(row, {
      ignoreVisitBuckets: true,
      allowNoSelection: true
    })
  );

  if (state.selectedBoundaryFeature) {
    const selectedBoundaryKey = getBoundaryKey(state.selectedBoundaryFeature);
    baseRows = baseRows.filter((row) => row._boundaryKey === selectedBoundaryKey);
  }

  for (const row of baseRows) {
    if (!row._visitBucket || !stats.has(row._visitBucket)) {
      continue;
    }

    const item = stats.get(row._visitBucket);
    item.count += 1;
    item.isAvailable = item.count > 0;
  }

  return [...stats.values()].sort((a, b) => a.order - b.order);
}

function collectTimeOptions(rows) {
  const available = new Set(["all"]);

  for (const row of rows) {
    if (row._timeBucket) {
      available.add(row._timeBucket);
    }
  }

  return CONFIG.timeWindowMeta
    .filter((item) => available.has(item.value))
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ value: item.value, label: item.label }));
}

/* ==========================================================================
   Row field derivation helpers
   ========================================================================== */

function getOrganizerLabel(rawValue) {
  const normalizedRaw = String(rawValue || "").trim();
  if (!normalizedRaw) {
    return CONFIG.unknownLabel;
  }
  return CONFIG.organizerAliases[normalizedRaw] || normalizedRaw;
}

function getDayInfo(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { key: "", label: "", index: -1, color: "#2563eb" };
  }

  const keys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  const key = keys[date.getDay()];
  const meta = CONFIG.dayMeta[key];

  return {
    key,
    label: meta?.label || "",
    index: meta?.index ?? date.getDay(),
    color: meta?.color || "#2563eb"
  };
}

function getOriginTypeMeta(typeKey) {
  return (
    CONFIG.originTypeMeta[typeKey] || {
      label: toTitleCase(typeKey || "Other"),
      color: CONFIG.originTypeMeta.other.color,
      fillColor: CONFIG.originTypeMeta.other.fillColor
    }
  );
}

function buildSiteKey(row) {
  const primaryParts = [
    normalizeSiteComponent(row.street_name_number),
    normalizeSiteComponent(row.city),
    normalizeSiteComponent(row.province)
  ].filter(Boolean);

  if (primaryParts.length >= 2) {
    return primaryParts.join("|");
  }

  const secondaryParts = [
    normalizeSiteComponent(row.address_raw),
    normalizeSiteComponent(row.location),
    normalizeSiteComponent(row.address)
  ].filter(Boolean);

  return secondaryParts[0] || "";
}

function normalizeSiteComponent(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\b(apartment|apt)\b/g, "apt")
    .replace(/\b(suite|ste)\b/g, "ste")
    .replace(/\b(road)\b/g, "rd")
    .replace(/\b(street)\b/g, "st")
    .replace(/\b(avenue)\b/g, "ave")
    .replace(/\b(boulevard)\b/g, "blvd")
    .replace(/\b(drive)\b/g, "dr")
    .replace(/\b(lane)\b/g, "ln")
    .replace(/\b(court)\b/g, "crt")
    .replace(/\b(place)\b/g, "pl")
    .replace(/\b(trail)\b/g, "trl")
    .replace(/\b(highway)\b/g, "hwy")
    .replace(/\s+/g, " ")
    .trim();
}

function getVisitBucket(count) {
  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }
  return count > 10 ? "10" : String(count);
}

function getVisitBucketLabel(bucket) {
  return CONFIG.visitBucketMeta.find((item) => item.value === bucket)?.label || "";
}

function getTimeWindowLabel(value) {
  return CONFIG.timeWindowMeta.find((item) => item.value === value)?.label || "";
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
    ) || CONFIG.popupEmptyValue
  );
}

function parsePossibleDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateFromObject(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium"
  }).format(date);
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

function getJoinKey(row) {
  if (!row) {
    return "";
  }

  const parts = [
    row.row_id || row.source_row_id || "",
    row.event_id || "",
    row.calendar_id || ""
  ].map((value) => String(value).trim());

  return parts.some(Boolean) ? parts.join("|") : "";
}

function getSelectedOrigin() {
  if (!state.selectedOriginId) {
    return null;
  }

  return state.originRows.find((origin) => origin.id === state.selectedOriginId) || null;
}

/* ==========================================================================
   Fetch + parsing helpers
   ========================================================================== */

function buildAssetUrl(path) {
  return `${CONFIG.supabaseBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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

function parseCsv(csvText) {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const normalized = csvText.replace(/^\uFEFF/, "");
  const lines = splitCsvLines(normalized);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rawLine = lines[i];
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

/* ==========================================================================
   Generic helpers
   ========================================================================== */

function createEmptyTimeContext() {
  return {
    now: null,
    startOfToday: null,
    endOfToday: null,
    last7Start: null,
    last30Start: null
  };
}

function createEmptyLoadSummary() {
  return {
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
    visibleRows: 0,
    candidateRowsWithBoundary: 0,
    candidateRowsWithoutBoundary: 0,
    distinctSites: 0,
    originRows: 0,
    visibleOriginRows: 0
  };
}

function cloneDefaultFilters() {
  return {
    keyword: DEFAULT_FILTERS.keyword,
    organizers: [],
    days: [],
    year: DEFAULT_FILTERS.year,
    visitBuckets: [],
    timeWindow: DEFAULT_FILTERS.timeWindow
  };
}

function tryFitMapToLayer(layer, padding = CONFIG.fitBoundsPaddingDefault) {
  try {
    const bounds = layer?.getBounds?.();
    if (bounds && bounds.isValid()) {
      state.map.fitBounds(bounds, { padding });
    }
  } catch (error) {
    logDebug(`fitBounds skipped: ${error.message}`);
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const num = Number(String(value).trim());
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
  return Number.isFinite(value) ? String(value) : CONFIG.popupEmptyValue;
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

function formatNumber(value, maximumFractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return CONFIG.popupEmptyValue;
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits
  }).format(value);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function toTitleCase(value) {
  return String(value ?? "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function setStatus(id, text) {
  if (ui[id]) {
    ui[id].textContent = text;
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