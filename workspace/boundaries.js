// workspace/boundaries.js

export function createBoundaryIndex(boundariesGeojson) {
  const features = Array.isArray(boundariesGeojson?.features)
    ? boundariesGeojson.features
    : [];

  const featuresByKey = new Map();

  features.forEach((feature) => {
    featuresByKey.set(getBoundaryKey(feature), feature);
  });

  return {
    features,
    featuresByKey
  };
}

export function getBoundaryKey(feature) {
  const props = feature?.properties || {};

  return String(
    props.id ||
      props.ID ||
      props.objectid ||
      props.OBJECTID ||
      props.munid ||
      props.MUNID ||
      props.name ||
      props.NAME ||
      ""
  ).trim();
}

export function getBoundaryName(feature) {
  const props = feature?.properties || {};

  return (
    props.name ||
    props.NAME ||
    props.municipality ||
    props.MUNICIPALITY ||
    props.region ||
    props.REGION ||
    ""
  );
}

export function findContainingBoundary(featureIndex, lngLat) {
  if (!featureIndex?.features?.length || !Array.isArray(lngLat)) {
    return null;
  }

  const [lng, lat] = lngLat;

  for (const feature of featureIndex.features) {
    if (pointInFeature([lng, lat], feature)) {
      return feature;
    }
  }

  return null;
}

export function getBoundaryStyle({ isSelected = false, count = 0 } = {}) {
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
      color: "#d97706",
      weight: 1.8,
      opacity: 1,
      fillColor: "#fbbf24",
      fillOpacity: 0.1
    };
  }

  return {
    color: "#94a3b8",
    weight: 1.2,
    opacity: 0.95,
    fillColor: "#e2e8f0",
    fillOpacity: 0.06
  };
}

function pointInFeature(point, feature) {
  const geometry = feature?.geometry;
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }

  return false;
}

function pointInPolygon(point, polygonRings) {
  if (!Array.isArray(polygonRings) || polygonRings.length === 0) {
    return false;
  }

  const outer = polygonRings[0];
  if (!isPointInRing(point, outer)) return false;

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

    if (intersects) inside = !inside;
  }

  return inside;
}