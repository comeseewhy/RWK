// workspace/markers.js

import { buildJobPopupHtml, buildOriginPopupHtml } from "./popup.js";

export function renderJobMarkers({
  rows,
  layerGroup,
  selectedBoundaryKey = "",
  onClick = null
}) {
  if (!layerGroup) return 0;

  const safeRows = Array.isArray(rows) ? rows : [];

  safeRows.forEach((row) => {
    const color = row._dayColor || "#2563eb";

    const marker = L.circleMarker([row._latitude, row._longitude], {
      radius: 6,
      weight: 1,
      opacity: 1,
      color,
      fillColor: color,
      fillOpacity: 0.82
    });

    marker.bindPopup(
      buildJobPopupHtml(row, {
        selectedBoundaryKey
      })
    );

    if (typeof onClick === "function") {
      marker.on("click", () => onClick(row, marker));
    }

    marker.addTo(layerGroup);
  });

  return safeRows.length;
}

export function renderOriginMarkers({
  origins,
  layerGroup,
  selectedOriginId = "",
  onSelect = null
}) {
  if (!layerGroup) return 0;

  const safeOrigins = Array.isArray(origins) ? origins : [];

  safeOrigins.forEach((origin) => {
    const isSelected = origin.id === selectedOriginId;
    const style = getOriginMarkerStyle(origin, isSelected);

    const marker = L.circleMarker([origin._latitude, origin._longitude], style);

    marker.bindPopup(
      buildOriginPopupHtml(origin, {
        isSelected
      })
    );

    if (typeof onSelect === "function") {
      marker.on("click", () => onSelect(origin, marker));
    }

    marker.addTo(layerGroup);
  });

  return safeOrigins.length;
}

function getOriginMarkerStyle(origin, isSelected) {
  const palette = {
    warehouse: { color: "#0f766e", fillColor: "#14b8a6" },
    showroom: { color: "#7c3aed", fillColor: "#a78bfa" },
    office: { color: "#2563eb", fillColor: "#60a5fa" },
    supplier: { color: "#b45309", fillColor: "#f59e0b" },
    other: { color: "#475569", fillColor: "#94a3b8" }
  };

  const meta = palette[origin._typeKey] || palette.other;

  return {
    radius: isSelected ? 11 : 9,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    color: isSelected ? "#111827" : meta.color,
    fillColor: meta.fillColor,
    fillOpacity: isSelected ? 0.95 : 0.88
  };
}