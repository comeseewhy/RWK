// config/presets.js

import { createRenderConfig } from "./renderConfig.schema.js";

export const PRESET_IDS = Object.freeze({
  INSTALL_UPCOMING: "INSTALL_UPCOMING",
  TEMPLATE_LAST_30: "TEMPLATE_LAST_30",
  HIGH_REPEAT_SITES: "HIGH_REPEAT_SITES",
  ORIGIN_PROXIMITY: "ORIGIN_PROXIMITY",
  ALL_ACTIVITY: "ALL_ACTIVITY"
});

export function buildInstallUpcomingPreset() {
  return createRenderConfig({
    meta: {
      presetId: PRESET_IDS.INSTALL_UPCOMING,
      selectionPath: "jobs/install/upcoming",
      label: "Upcoming installs",
      description: "Focus on upcoming install activity."
    },
    filters: {
      organizers: ["install"],
      timeWindow: "upcoming"
    },
    analytics: {
      mode: "temporal",
      sortBy: "date"
    }
  });
}

export function buildTemplateLast30Preset() {
  return createRenderConfig({
    meta: {
      presetId: PRESET_IDS.TEMPLATE_LAST_30,
      selectionPath: "jobs/template/last-30-days",
      label: "Templates in last 30 days",
      description: "Review recent template-related activity."
    },
    filters: {
      organizers: ["template"],
      timeWindow: "last_30_days"
    },
    analytics: {
      mode: "temporal",
      sortBy: "date"
    }
  });
}

export function buildHighRepeatSitesPreset() {
  return createRenderConfig({
    meta: {
      presetId: PRESET_IDS.HIGH_REPEAT_SITES,
      selectionPath: "sites/high-repeat",
      label: "High-repeat sites",
      description: "Focus on locations with repeated operational activity."
    },
    filters: {
      visitBuckets: ["3", "4", "5", "6", "7", "8", "9", "10"]
    },
    analytics: {
      mode: "repeat_sites",
      groupBy: "site",
      sortBy: "visitCount"
    }
  });
}

export function buildOriginProximityPreset() {
  return createRenderConfig({
    meta: {
      presetId: PRESET_IDS.ORIGIN_PROXIMITY,
      selectionPath: "origins/proximity",
      label: "Origin proximity view",
      description: "Prepare for origin-oriented routing and nearest-origin analysis."
    },
    origins: {
      includeOrigins: true,
      nearestOriginOnly: false,
      originTypes: []
    },
    visualization: {
      showOrigins: true
    },
    analytics: {
      mode: "origin_proximity",
      groupBy: "nearestOrigin"
    }
  });
}

export function buildAllActivityPreset() {
  return createRenderConfig({
    meta: {
      presetId: PRESET_IDS.ALL_ACTIVITY,
      selectionPath: "overview/all-activity",
      label: "All activity overview",
      description: "Broad operational overview with no narrow population constraint yet."
    }
  });
}

export const PRESETS = Object.freeze({
  [PRESET_IDS.INSTALL_UPCOMING]: buildInstallUpcomingPreset,
  [PRESET_IDS.TEMPLATE_LAST_30]: buildTemplateLast30Preset,
  [PRESET_IDS.HIGH_REPEAT_SITES]: buildHighRepeatSitesPreset,
  [PRESET_IDS.ORIGIN_PROXIMITY]: buildOriginProximityPreset,
  [PRESET_IDS.ALL_ACTIVITY]: buildAllActivityPreset
});