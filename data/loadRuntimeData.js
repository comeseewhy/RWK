// data/loadRuntimeData.js

import { normalizeRuntimeData } from "./parseRuntimeData.js";

export const RUNTIME_DATA_CONFIG = Object.freeze({
  boundariesUrl: "./data/boundaries.geojson",
  originsUrl: "./data/origins.json",
  supabaseBaseUrl:
    "https://avtthmyizixxlkblbzqe.supabase.co/storage/v1/object/public/live-data",
  manifestPath: "meta/manifest.json",
  eventsCsvPath: "csv/events_active_snapshot.csv",
  exportCsvPath: "csv/export_confirmed_verified.csv"
});

export async function loadRuntimeData(onProgress = () => {}) {
  const progress = createProgressReporter(onProgress);

  progress("starting", {
    label: "Preparing runtime data..."
  });

  const boundariesGeojson = await fetchJson(RUNTIME_DATA_CONFIG.boundariesUrl);
  progress("boundaries", {
    label: "Boundaries loaded",
    count: Array.isArray(boundariesGeojson?.features)
      ? boundariesGeojson.features.length
      : 0
  });

  const origins = await fetchJson(RUNTIME_DATA_CONFIG.originsUrl);
  progress("origins", {
    label: "Origins loaded",
    count: Array.isArray(origins) ? origins.length : 0
  });

  const manifestUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.manifestPath);
  const eventsUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.eventsCsvPath);
  const exportUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.exportCsvPath);

  const manifest = await fetchJson(manifestUrl);
  progress("manifest", {
    label: "Manifest loaded",
    updatedAt: manifest?.updated_at || ""
  });

  const eventsCsvText = await fetchText(eventsUrl);
  progress("events", {
    label: "Events snapshot loaded"
  });

  const exportCsvText = await fetchText(exportUrl);
  progress("export", {
    label: "Spatial export loaded"
  });

  const runtimeData = normalizeRuntimeData({
    boundariesGeojson,
    origins,
    manifest,
    eventsCsvText,
    exportCsvText
  });

  progress("complete", {
    label: "Runtime data ready",
    summary: runtimeData.summary
  });

  return runtimeData;
}

function buildAssetUrl(path) {
  return `${RUNTIME_DATA_CONFIG.supabaseBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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

function createProgressReporter(onProgress) {
  return (step, detail = {}) => {
    try {
      onProgress({
        step,
        ...detail
      });
    } catch (error) {
      console.warn("[RWK] Progress callback failed:", error);
    }
  };
}