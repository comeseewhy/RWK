// workspace/boundaries.js

export function createBoundaryIndex(boundariesGeojson) {
  const features = Array.isArray(boundariesGeojson?.features)
    ? boundariesGeojson.features
    : [];

  const featuresByKey = new Map();

  features.forEach((feature) => {
    const key = getBoundaryKey(feature);
    if (key) {
      featuresByKey.set(key, feature);
    }
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

export function getBoundaryStyle({
  isSelected = false,
  activeCount = 0
} = {}) {
  const hasActivePoints = activeCount > 0;

  if (isSelected) {
    return {
      color: hasActivePoints ? "#b45309" : "#475569",
      weight: 3.25,
      opacity: 1,
      fillColor: hasActivePoints ? "#fbbf24" : "#cbd5e1",
      fillOpacity: hasActivePoints ? 0.24 : 0.14
    };
  }

  if (hasActivePoints) {
    return {
      color: "#d97706",
      weight: 1.9,
      opacity: 1,
      fillColor: "#fbbf24",
      fillOpacity: 0.11
    };
  }

  return {
    color: "#94a3b8",
    weight: 1.15,
    opacity: 0.92,
    fillColor: "#e2e8f0",
    fillOpacity: 0.045
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