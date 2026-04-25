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

const RUNTIME_STEPS = Object.freeze({
  starting: 4,
  boundaries: 18,
  origins: 30,
  manifest: 44,
  events: 64,
  export: 82,
  normalizing: 92,
  complete: 100
});

export async function loadRuntimeData(onProgress = () => {}) {
  const progress = createProgressReporter(onProgress);

  progress("starting", {
    label: "Preparing shared runtime...",
    percent: RUNTIME_STEPS.starting
  });

  const manifestUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.manifestPath);
  const eventsUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.eventsCsvPath);
  const exportUrl = buildAssetUrl(RUNTIME_DATA_CONFIG.exportCsvPath);

  const boundariesPromise = fetchJson(RUNTIME_DATA_CONFIG.boundariesUrl).then((data) => {
    progress("boundaries", {
      label: "Boundaries loaded",
      percent: RUNTIME_STEPS.boundaries,
      count: Array.isArray(data?.features) ? data.features.length : 0
    });
    return data;
  });

  const originsPromise = fetchJson(RUNTIME_DATA_CONFIG.originsUrl).then((data) => {
    progress("origins", {
      label: "Origins loaded",
      percent: RUNTIME_STEPS.origins,
      count: Array.isArray(data) ? data.length : 0
    });
    return data;
  });

  const manifestPromise = fetchJson(manifestUrl).then((data) => {
    progress("manifest", {
      label: "Manifest loaded",
      percent: RUNTIME_STEPS.manifest,
      updatedAt: data?.updated_at || ""
    });
    return data;
  });

  const eventsPromise = fetchText(eventsUrl).then((text) => {
    progress("events", {
      label: "Events snapshot loaded",
      percent: RUNTIME_STEPS.events
    });
    return text;
  });

  const exportPromise = fetchText(exportUrl).then((text) => {
    progress("export", {
      label: "Spatial export loaded",
      percent: RUNTIME_STEPS.export
    });
    return text;
  });

  const [
    boundariesGeojson,
    origins,
    manifest,
    eventsCsvText,
    exportCsvText
  ] = await Promise.all([
    boundariesPromise,
    originsPromise,
    manifestPromise,
    eventsPromise,
    exportPromise
  ]);

  progress("normalizing", {
    label: "Indexing runtime...",
    percent: RUNTIME_STEPS.normalizing
  });

  const runtimeData = normalizeRuntimeData({
    boundariesGeojson,
    origins,
    manifest,
    eventsCsvText,
    exportCsvText
  });

  progress("complete", {
    label: "Runtime ready",
    percent: RUNTIME_STEPS.complete,
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
        percent: detail.percent ?? RUNTIME_STEPS[step] ?? 0,
        ...detail
      });
    } catch (error) {
      console.warn("[RWK] Progress callback failed:", error);
    }
  };
}