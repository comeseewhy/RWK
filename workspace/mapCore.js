// workspace/mapCore.js

const DEFAULT_PROJECT_CENTER = [43.6532, -79.3832];
const DEFAULT_PROJECT_ZOOM = 9;

export function initWorkspaceMap(options = {}) {
  const {
    elementId = "map",
    center = DEFAULT_PROJECT_CENTER,
    zoom = DEFAULT_PROJECT_ZOOM
  } = options;

  if (typeof L === "undefined") {
    throw new Error("Leaflet is not available on window.");
  }

  const map = L.map(elementId, {
    zoomControl: true,
    preferCanvas: true
  }).setView(center, zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  return map;
}

export function ensureWorkspaceLayers(map) {
  if (!map) {
    throw new Error("Map instance is required.");
  }

  return {
    boundaries: L.layerGroup().addTo(map),
    jobs: L.layerGroup().addTo(map),
    origins: L.layerGroup().addTo(map)
  };
}

export function clearWorkspaceLayers(layers) {
  if (!layers) return;

  Object.values(layers).forEach((layer) => {
    if (layer?.clearLayers) {
      layer.clearLayers();
    }
  });
}

export function createBoundsFromRows(rows = []) {
  const bounds = L.latLngBounds([]);

  rows.forEach((row) => {
    if (Number.isFinite(row?._latitude) && Number.isFinite(row?._longitude)) {
      bounds.extend([row._latitude, row._longitude]);
    }
  });

  return bounds.isValid() ? bounds : null;
}

export function createBoundsFromGeoJsonFeatures(features = []) {
  const bounds = L.latLngBounds([]);

  features.filter(Boolean).forEach((feature) => {
    const featureBounds = L.geoJSON(feature).getBounds();

    if (featureBounds?.isValid?.()) {
      bounds.extend(featureBounds);
    }
  });

  return bounds.isValid() ? bounds : null;
}

export function createBoundsFromGeoJson(geojson) {
  if (!geojson) return null;

  const bounds = L.geoJSON(geojson).getBounds();
  return bounds?.isValid?.() ? bounds : null;
}

export function fitWorkspaceToBounds(map, bounds, options = {}) {
  if (!map || !bounds?.isValid?.()) {
    return false;
  }

  const {
    mode = "project",
    animate = true,
    maxZoom = 13
  } = options;

  invalidateMapSizeBeforeFit(map);

  const fitOptions = {
    animate,
    maxZoom,
    ...getResponsiveFitPadding(map, mode)
  };

  map.fitBounds(bounds, fitOptions);

  return true;
}

export function fitWorkspaceToData(map, rowsOrBounds, options = {}) {
  if (!map || !rowsOrBounds) return false;

  if (rowsOrBounds?.isValid?.()) {
    return fitWorkspaceToBounds(map, rowsOrBounds, options);
  }

  if (Array.isArray(rowsOrBounds)) {
    const bounds = createBoundsFromRows(rowsOrBounds);
    return fitWorkspaceToBounds(map, bounds, options);
  }

  return false;
}

function invalidateMapSizeBeforeFit(map) {
  map.invalidateSize({ animate: false });

  window.requestAnimationFrame?.(() => {
    map.invalidateSize({ animate: false });
  });
}

function getResponsiveFitPadding(map, mode) {
  const size = map.getSize();
  const width = Number(size?.x || 0);
  const height = Number(size?.y || 0);
  const isNarrow = width <= 720;
  const isShort = height <= 520;

  if (mode === "selected-boundaries") {
    return {
      paddingTopLeft: [
        Math.round(width * (isNarrow ? 0.045 : 0.045)),
        Math.round(height * (isNarrow ? 0.08 : 0.07))
      ],
      paddingBottomRight: [
        Math.round(width * (isNarrow ? 0.045 : 0.06)),
        Math.round(height * (isShort ? 0.11 : 0.09))
      ]
    };
  }

  return {
    paddingTopLeft: [
      Math.round(width * (isNarrow ? 0.055 : 0.04)),
      Math.round(height * (isNarrow ? 0.08 : 0.06))
    ],
    paddingBottomRight: [
      Math.round(width * (isNarrow ? 0.055 : 0.055)),
      Math.round(height * (isShort ? 0.12 : 0.08))
    ]
  };
}