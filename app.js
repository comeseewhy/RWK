const CONFIG = {
  boundariesUrl: "./data/boundaries.geojson",

  // Fill these in when your Supabase public bucket is ready.
  // Example:
  // supabaseBaseUrl: "https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/live-data",
  supabaseBaseUrl: "",

  manifestPath: "meta/manifest.json",
  eventsCsvPath: "csv/events_active_snapshot.csv",
  exportCsvPath: "csv/export_confirmed_verified.csv",

  defaultMapCenter: [43.6532, -79.3832],
  defaultMapZoom: 9
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
  visibleRows: []
};

const ui = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheUi();
  bindUi();
  initMap();
  setStatus("appStatus", "Running");
  logDebug("App initialized.");

  await loadPhaseThreeShell();
}

function cacheUi() {
  ui.appStatus = document.getElementById("appStatus");
  ui.manifestStatus = document.getElementById("manifestStatus");
  ui.boundariesStatus = document.getElementById("boundariesStatus");
  ui.eventsStatus = document.getElementById("eventsStatus");
  ui.exportStatus = document.getElementById("exportStatus");
  ui.joinedCount = document.getElementById("joinedCount");
  ui.updatedAt = document.getElementById("updatedAt");
  ui.selectedBoundaryName = document.getElementById("selectedBoundaryName");
  ui.boundaryFeatureCount = document.getElementById("boundaryFeatureCount");
  ui.visibleMarkerCount = document.getElementById("visibleMarkerCount");
  ui.debugOutput = document.getElementById("debugOutput");
  ui.refreshButton = document.getElementById("refreshButton");
  ui.clearBoundaryButton = document.getElementById("clearBoundaryButton");
}

function bindUi() {
  ui.refreshButton.addEventListener("click", () => {
    loadPhaseThreeShell();
  });

  ui.clearBoundaryButton.addEventListener("click", () => {
    clearBoundarySelection();
    renderMarkers();
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

async function loadPhaseThreeShell() {
  clearDebug();
  logDebug("Reload started.");

  setStatus("manifestStatus", "Pending");
  setStatus("boundariesStatus", "Pending");
  setStatus("eventsStatus", "Pending");
  setStatus("exportStatus", "Pending");
  setText(ui.updatedAt, "—");
  setText(ui.joinedCount, "0");

  try {
    await loadBoundaries();
    await loadRemoteData();
    joinData();
    renderMarkers();
    updateSummaryUi();
  } catch (error) {
    console.error(error);
    logDebug(`Fatal load error: ${error.message}`);
    setStatus("appStatus", "Error");
  }
}

async function loadBoundaries() {
  logDebug(`Loading boundaries from ${CONFIG.boundariesUrl}`);

  const response = await fetch(CONFIG.boundariesUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load boundaries GeoJSON (${response.status})`);
  }

  const geojson = await response.json();
  state.boundariesGeojson = geojson;

  if (state.boundaryLayer) {
    state.map.removeLayer(state.boundaryLayer);
  }

  state.boundaryLayer = L.geoJSON(geojson, {
    style: boundaryStyleDefault,
    onEachFeature: onEachBoundaryFeature
  }).addTo(state.map);

  const featureCount = Array.isArray(geojson.features) ? geojson.features.length : 0;
  setStatus("boundariesStatus", `Loaded (${featureCount})`);
  setText(ui.boundaryFeatureCount, String(featureCount));
  logDebug(`Boundaries loaded: ${featureCount} feature(s).`);

  tryFitMapToLayer(state.boundaryLayer);
}

function boundaryStyleDefault() {
  return {
    color: "#2563eb",
    weight: 1.2,
    opacity: 0.9,
    fillColor: "#60a5fa",
    fillOpacity: 0.08
  };
}

function boundaryStyleHover() {
  return {
    color: "#1d4ed8",
    weight: 2.4,
    opacity: 1,
    fillColor: "#3b82f6",
    fillOpacity: 0.16
  };
}

function boundaryStyleSelected() {
  return {
    color: "#0f766e",
    weight: 2.8,
    opacity: 1,
    fillColor: "#14b8a6",
    fillOpacity: 0.2
  };
}

function onEachBoundaryFeature(feature, layer) {
  layer.on({
    mouseover: () => {
      if (state.selectedBoundaryLayer !== layer) {
        layer.setStyle(boundaryStyleHover());
      }
    },
    mouseout: () => {
      if (state.selectedBoundaryLayer !== layer) {
        layer.setStyle(boundaryStyleDefault());
      }
    },
    click: () => {
      selectBoundary(feature, layer);
      renderMarkers();
    }
  });

  const boundaryName = getBoundaryName(feature) || "Boundary";
  layer.bindTooltip(boundaryName, {
    sticky: true
  });
}

function selectBoundary(feature, layer) {
  if (state.selectedBoundaryLayer === layer) {
    clearBoundarySelection();
    return;
  }

  clearBoundarySelection(false);

  state.selectedBoundaryFeature = feature;
  state.selectedBoundaryLayer = layer;
  layer.setStyle(boundaryStyleSelected());

  const boundaryName = getBoundaryName(feature) || "Boundary";
  setText(ui.selectedBoundaryName, boundaryName);
  logDebug(`Boundary selected: ${boundaryName}`);
}

function clearBoundarySelection(resetText = true) {
  if (state.selectedBoundaryLayer) {
    state.selectedBoundaryLayer.setStyle(boundaryStyleDefault());
  }

  state.selectedBoundaryFeature = null;
  state.selectedBoundaryLayer = null;

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
    logDebug("Supabase base URL is blank. Skipping manifest/CSV fetch.");
    state.manifest = null;
    state.eventsRows = [];
    state.exportRows = [];
    return;
  }

  const manifestUrl = buildAssetUrl(CONFIG.manifestPath);
  const eventsUrl = buildAssetUrl(CONFIG.eventsCsvPath);
  const exportUrl = buildAssetUrl(CONFIG.exportCsvPath);

  logDebug(`Fetching manifest: ${manifestUrl}`);
  state.manifest = await fetchJson(manifestUrl);
  setStatus("manifestStatus", "Loaded");

  if (state.manifest && state.manifest.updated_at) {
    setText(ui.updatedAt, formatTimestamp(state.manifest.updated_at));
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
}

function joinData() {
  const eventIndex = new Map();
  const unmatchedEventIds = [];

  for (const row of state.eventsRows) {
    const joinKey = getJoinKey(row);
    if (!joinKey) {
      unmatchedEventIds.push(row);
      continue;
    }
    eventIndex.set(joinKey, row);
  }

  const joined = [];
  let unmatchedExportCount = 0;

  for (const exportRow of state.exportRows) {
    const joinKey = getJoinKey(exportRow);
    const eventRow = joinKey ? eventIndex.get(joinKey) : null;

    if (!eventRow) {
      unmatchedExportCount += 1;
    }

    joined.push(buildJoinedRow(exportRow, eventRow));
  }

  state.joinedRows = joined;
  logDebug(
    `Join complete. joined=${joined.length}, unmatched_export=${unmatchedExportCount}, unmatched_event_without_key=${unmatchedEventIds.length}`
  );
}

function buildJoinedRow(exportRow, eventRow) {
  const latitude = toNumber(
    exportRow.latitude ||
      exportRow.lat ||
      exportRow.y ||
      exportRow.decimal_latitude
  );

  const longitude = toNumber(
    exportRow.longitude ||
      exportRow.lng ||
      exportRow.lon ||
      exportRow.x ||
      exportRow.decimal_longitude
  );

  const title =
    exportRow.title ||
    exportRow.summary ||
    exportRow.customer_name ||
    (eventRow && (eventRow.title || eventRow.summary)) ||
    "Record";

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

function renderMarkers() {
  state.markerLayer.clearLayers();

  const candidateRows = state.joinedRows.filter((row) =>
    Number.isFinite(row._latitude) && Number.isFinite(row._longitude)
  );

  let visibleRows = candidateRows;

  if (state.selectedBoundaryFeature) {
    visibleRows = candidateRows.filter((row) =>
      pointInFeature([row._longitude, row._latitude], state.selectedBoundaryFeature)
    );
  }

  state.visibleRows = visibleRows;

  for (const row of visibleRows) {
    const marker = L.circleMarker([row._latitude, row._longitude], {
      radius: 6,
      weight: 1,
      opacity: 1,
      color: "#1d4ed8",
      fillColor: "#2563eb",
      fillOpacity: 0.8
    });

    marker.bindPopup(buildPopupHtml(row));
    marker.addTo(state.markerLayer);
  }

  setText(ui.visibleMarkerCount, String(visibleRows.length));
  setText(ui.joinedCount, String(state.joinedRows.length));
  logDebug(
    `Rendered markers: visible=${visibleRows.length}, candidate=${candidateRows.length}`
  );

  if (visibleRows.length > 0) {
    const group = L.featureGroup(
      visibleRows.map((row) => L.marker([row._latitude, row._longitude]))
    );
    tryFitMapToLayer(group);
  }
}

function buildPopupHtml(row) {
  const boundaryName = state.selectedBoundaryFeature
    ? getBoundaryName(state.selectedBoundaryFeature) || "Selected boundary"
    : "None";

  return `
    <div>
      <h3 class="popup-title">${escapeHtml(row._title || "Record")}</h3>
      <p class="popup-meta"><span class="popup-label">Row ID:</span> ${escapeHtml(row.row_id || "—")}</p>
      <p class="popup-meta"><span class="popup-label">Event ID:</span> ${escapeHtml(row.event_id || "—")}</p>
      <p class="popup-meta"><span class="popup-label">Date:</span> ${escapeHtml(row.date || row.start_date || row.event_date || "—")}</p>
      <p class="popup-meta"><span class="popup-label">Address:</span> ${escapeHtml(composeAddress(row) || "—")}</p>
      <p class="popup-meta"><span class="popup-label">Joined:</span> ${row._joined ? "Yes" : "No"}</p>
      <p class="popup-meta"><span class="popup-label">Boundary filter:</span> ${escapeHtml(boundaryName)}</p>
    </div>
  `;
}

function updateSummaryUi() {
  if (state.manifest && state.manifest.updated_at) {
    setText(ui.updatedAt, formatTimestamp(state.manifest.updated_at));
  }
}

function buildAssetUrl(path) {
  return `${CONFIG.supabaseBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON (${response.status}) from ${url}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch text (${response.status}) from ${url}`);
  }
  return response.text();
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
    row.row_id || "",
    row.event_id || "",
    row.calendar_id || ""
  ].map((value) => String(value).trim());

  const hasAny = parts.some(Boolean);
  return hasAny ? parts.join("|") : "";
}

function composeAddress(row) {
  const pieces = [
    row.address,
    row.street,
    row.city,
    row.province,
    row.postal_code
  ].filter(Boolean);

  return pieces.join(", ");
}

function getBoundaryName(feature) {
  if (!feature || !feature.properties) {
    return "";
  }

  return (
    feature.properties.name ||
    feature.properties.NAME ||
    feature.properties.municipality ||
    feature.properties.MUNICIPALITY ||
    feature.properties.region ||
    feature.properties.REGION ||
    ""
  );
}

function pointInFeature(point, feature) {
  const geometry = feature && feature.geometry;
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
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function tryFitMapToLayer(layer) {
  try {
    const bounds = layer.getBounds();
    if (bounds && bounds.isValid()) {
      state.map.fitBounds(bounds, {
        padding: [20, 20]
      });
    }
  } catch (error) {
    logDebug(`fitBounds skipped: ${error.message}`);
  }
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
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

function clearDebug() {
  ui.debugOutput.textContent = "";
}

function logDebug(message) {
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
