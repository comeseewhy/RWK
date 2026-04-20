// workspace/mapCore.js

export function initWorkspaceMap(options = {}) {
  const {
    elementId = "map",
    center = [43.6532, -79.3832],
    zoom = 9
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

export function fitWorkspaceToData(map, rowsOrBounds, options = {}) {
  if (!map || !rowsOrBounds) return;

  const padding = options.padding || [24, 24];

  if (Array.isArray(rowsOrBounds) && rowsOrBounds.length > 0) {
    const latLngs = rowsOrBounds
      .filter((row) => Number.isFinite(row._latitude) && Number.isFinite(row._longitude))
      .map((row) => [row._latitude, row._longitude]);

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    }
    return;
  }

  if (rowsOrBounds?.isValid?.()) {
    map.fitBounds(rowsOrBounds, { padding });
  }
}