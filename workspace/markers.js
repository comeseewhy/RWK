// workspace/markers.js

import { buildJobPopupHtml, buildOriginPopupHtml } from "./popup.js";

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
  selectedBoundaryKeys = [],
  onClick = null
}) {
  if (!layerGroup) return 0;

  const safeRows = Array.isArray(rows) ? rows : [];
  const markerSelectionEnabled =
    Array.isArray(selectedBoundaryKeys) && selectedBoundaryKeys.length > 0;

  safeRows.forEach((row) => {
    const color = row._dayColor || "#2563eb";

    const marker = L.circleMarker([row._latitude, row._longitude], {
      radius: markerSelectionEnabled ? 6.5 : 5.5,
      weight: markerSelectionEnabled ? 1.25 : 1,
      opacity: markerSelectionEnabled ? 1 : 0.72,
      color,
      fillColor: color,
      fillOpacity: markerSelectionEnabled ? 0.82 : 0.58,
      interactive: markerSelectionEnabled
    });

    if (markerSelectionEnabled) {
      marker.bindPopup(
        buildJobPopupHtml(row, {
          selectedBoundaryKey: selectedBoundaryKeys.join(",")
        })
      );

      if (typeof onClick === "function") {
        marker.on("click", () => onClick(row, marker));
      }
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
    const palette = getOriginPalette(origin);

    const marker = L.circleMarker([origin._latitude, origin._longitude], style);

    marker.bindTooltip(origin.name || "Origin", {
      permanent: true,
      direction: "right",
      offset: [12, 0],
      className: palette.labelClassName
    });

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