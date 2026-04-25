// workspace/markers.js

const ORIGIN_PALETTE = Object.freeze({
  warehouse: {
    color: "#0f766e",
    fillColor: "#14b8a6",
    labelClassName: "origin-label origin-label--warehouse"
  },
  showroom: {
    color: "#7c3aed",
    fillColor: "#a78bfa",
    labelClassName: "origin-label origin-label--showroom"
  }
});

export function renderJobMarkers({
  rows,
  layerGroup,
  selectedBoundaryKeys = []
}) {
  if (!layerGroup) return 0;

  const safeRows = Array.isArray(rows) ? rows : [];
  const hasBoundaryContext =
    Array.isArray(selectedBoundaryKeys) && selectedBoundaryKeys.length > 0;

  let renderedCount = 0;

  safeRows.forEach((row) => {
    if (!Number.isFinite(row?._latitude) || !Number.isFinite(row?._longitude)) {
      return;
    }

    const color = row._dayColor || "#2563eb";

    L.circleMarker([row._latitude, row._longitude], {
      radius: hasBoundaryContext ? 6.5 : 5.5,
      weight: hasBoundaryContext ? 1.25 : 1,
      opacity: hasBoundaryContext ? 1 : 0.72,
      color,
      fillColor: color,
      fillOpacity: hasBoundaryContext ? 0.82 : 0.58,

      // Privacy hardening:
      // Data points are visual-only. No click, keyboard, tooltip, or popup access.
      interactive: false,
      bubblingMouseEvents: false,
      keyboard: false
    }).addTo(layerGroup);

    renderedCount += 1;
  });

  return renderedCount;
}

export function renderOriginMarkers({
  origins,
  layerGroup,
  selectedOriginId = ""
}) {
  if (!layerGroup) return 0;

  const safeOrigins = Array.isArray(origins) ? origins : [];
  let renderedCount = 0;

  safeOrigins.forEach((origin) => {
    if (!Number.isFinite(origin?._latitude) || !Number.isFinite(origin?._longitude)) {
      return;
    }

    const isSelected = origin.id === selectedOriginId;
    const style = getOriginMarkerStyle(origin, isSelected);
    const palette = getOriginPalette(origin);

    const marker = L.circleMarker([origin._latitude, origin._longitude], {
      ...style,

      // Origins keep non-sensitive permanent labels only.
      // No address, ID, notes, boundary, or popup details are exposed.
      interactive: false,
      bubblingMouseEvents: false,
      keyboard: false
    });

    marker.bindTooltip(origin.name || "Origin", {
      permanent: true,
      direction: "right",
      offset: [12, 0],
      className: palette.labelClassName
    });

    marker.addTo(layerGroup);
    renderedCount += 1;
  });

  return renderedCount;
}

function getOriginMarkerStyle(origin, isSelected) {
  const palette = getOriginPalette(origin);

  return {
    radius: isSelected ? 11 : 9,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    color: isSelected ? "#111827" : palette.color,
    fillColor: palette.fillColor,
    fillOpacity: isSelected ? 0.95 : 0.88
  };
}

function getOriginPalette(origin) {
  return ORIGIN_PALETTE[origin?._typeKey] || ORIGIN_PALETTE.showroom;
}