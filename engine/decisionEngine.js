// engine/decisionEngine.js

import {
  buildAllActivityPreset,
  buildHighRepeatSitesPreset,
  buildInstallUpcomingPreset,
  buildOriginProximityPreset,
  buildTemplateLast30Preset
} from "../config/presets.js";

const PATH_RESOLVERS = Object.freeze({
  "overview/all-activity": buildAllActivityPreset,
  "jobs/install/upcoming": buildInstallUpcomingPreset,
  "jobs/template/last-30-days": buildTemplateLast30Preset,
  "sites/high-repeat": buildHighRepeatSitesPreset,
  "origins/proximity": buildOriginProximityPreset
});

export function resolveConfig(selectionPath) {
  const resolver = PATH_RESOLVERS[selectionPath];
  return resolver ? resolver() : null;
}

export function getAvailableSelectionPaths() {
  return Object.keys(PATH_RESOLVERS);
}