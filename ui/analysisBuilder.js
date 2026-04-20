import { createRenderConfig } from "../config/renderConfig.schema.js";
import {
  ANALYSIS_BUILDER_DATE_MODES,
  ANALYSIS_BUILDER_ORGANIZER_OPTIONS
} from "../config/analysisProfiles.js";

export function renderAnalysisBuilder() {
  return `
    <section class="launcher-builder" aria-labelledby="analysisBuilderTitle">
      <div class="launcher-section-heading">
        <p class="launcher-section-heading__eyebrow">Builder</p>
        <h2 id="analysisBuilderTitle" class="launcher-section-heading__title">
          Build an analysis
        </h2>
        <p class="launcher-section-heading__description">
          Use organizer and time logic as the entry question, then refine with boundaries,
          visit patterns, and origins inside the workspace.
        </p>
      </div>

      <div class="launcher-builder__grid">
        <div class="launcher-field">
          <span class="launcher-label">Organizer type</span>
          <div class="launcher-chip-group" id="builderOrganizerGroup">
            ${ANALYSIS_BUILDER_ORGANIZER_OPTIONS.map(
              (option) => `
                <button
                  class="launcher-chip"
                  type="button"
                  data-builder-organizer="${option.value}"
                  aria-pressed="false"
                >
                  ${option.label}
                </button>
              `
            ).join("")}
          </div>
        </div>

        <div class="launcher-field">
          <label class="launcher-label" for="builderDateMode">Date mode</label>
          <select id="builderDateMode" class="launcher-input">
            ${ANALYSIS_BUILDER_DATE_MODES.map(
              (option) => `<option value="${option.value}">${option.label}</option>`
            ).join("")}
          </select>
        </div>

        <div class="launcher-field" id="builderSingleDateField" hidden>
          <label class="launcher-label" for="builderSingleDate">Date</label>
          <input id="builderSingleDate" class="launcher-input" type="date" />
        </div>

        <div class="launcher-field" id="builderRangeStartField" hidden>
          <label class="launcher-label" for="builderRangeStart">Range start</label>
          <input id="builderRangeStart" class="launcher-input" type="date" />
        </div>

        <div class="launcher-field" id="builderRangeEndField" hidden>
          <label class="launcher-label" for="builderRangeEnd">Range end</label>
          <input id="builderRangeEnd" class="launcher-input" type="date" />
        </div>

        <div class="launcher-field">
          <label class="launcher-label" for="builderKeyword">Keyword</label>
          <input
            id="builderKeyword"
            class="launcher-input"
            type="text"
            placeholder="Optional keyword"
          />
        </div>
      </div>

      <div class="launcher-builder__actions">
        <button id="builderLaunchButton" class="button button--primary" type="button">
          Open analysis
        </button>
      </div>

      <p id="builderFeedback" class="launcher-feedback" aria-live="polite"></p>
    </section>
  `;
}

export function bindAnalysisBuilder({ onLaunch }) {
  const organizerButtons = [
    ...document.querySelectorAll("[data-builder-organizer]")
  ];
  const dateModeSelect = document.getElementById("builderDateMode");
  const singleDateField = document.getElementById("builderSingleDateField");
  const rangeStartField = document.getElementById("builderRangeStartField");
  const rangeEndField = document.getElementById("builderRangeEndField");
  const launchButton = document.getElementById("builderLaunchButton");
  const feedback = document.getElementById("builderFeedback");

  const state = {
    organizers: []
  };

  organizerButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.builderOrganizer;
      const index = state.organizers.indexOf(value);

      if (index >= 0) {
        state.organizers.splice(index, 1);
      } else {
        state.organizers.push(value);
      }

      syncOrganizerButtons(organizerButtons, state.organizers);
    });
  });

  dateModeSelect?.addEventListener("change", () => {
    syncDateFields(dateModeSelect.value, {
      singleDateField,
      rangeStartField,
      rangeEndField
    });
  });

  launchButton?.addEventListener("click", () => {
    try {
      const config = buildAnalysisRenderConfig({
        organizers: state.organizers,
        dateMode: dateModeSelect?.value || "today",
        singleDate: document.getElementById("builderSingleDate")?.value || "",
        rangeStart: document.getElementById("builderRangeStart")?.value || "",
        rangeEnd: document.getElementById("builderRangeEnd")?.value || "",
        keyword: document.getElementById("builderKeyword")?.value || ""
      });

      feedback.textContent = `Opening workspace: ${config.meta.label}`;

      if (typeof onLaunch === "function") {
        onLaunch(config);
      }
    } catch (error) {
      feedback.textContent = error.message;
    }
  });

  syncDateFields(dateModeSelect?.value || "today", {
    singleDateField,
    rangeStartField,
    rangeEndField
  });
}

export function buildAnalysisRenderConfig({
  organizers,
  dateMode,
  singleDate,
  rangeStart,
  rangeEnd,
  keyword
}) {
  if (!Array.isArray(organizers) || organizers.length === 0) {
    throw new Error("Select at least one organizer type.");
  }

  const normalizedKeyword = String(keyword || "").trim();

  const config = createRenderConfig({
    meta: {
      presetId: "ANALYSIS_BUILDER",
      selectionPath: "builder/custom-analysis",
      label: "Custom analysis",
      description: "Manual launcher-defined analysis."
    },
    filters: {
      keyword: normalizedKeyword,
      organizers: [...organizers]
    },
    analytics: {
      mode: "standard",
      groupBy: null,
      sortBy: "date"
    }
  });

  if (dateMode === "today") {
    config.filters.timeWindow = "upcoming";
    config.meta.description = "Organizer-based analysis for today and immediate upcoming activity.";
  }

  if (dateMode === "this_week") {
    config.meta.description = "Organizer-based analysis for this week.";
    config.analytics.groupBy = "day";
  }

  if (dateMode === "custom_date") {
    if (!singleDate) {
      throw new Error("Choose a custom date.");
    }

    config.meta.description = `Organizer-based analysis for ${singleDate}.`;
    config.filters.customDate = singleDate;
  }

  if (dateMode === "custom_range") {
    if (!rangeStart || !rangeEnd) {
      throw new Error("Choose both range start and range end.");
    }

    config.meta.description = `Organizer-based analysis for ${rangeStart} to ${rangeEnd}.`;
    config.filters.customRangeStart = rangeStart;
    config.filters.customRangeEnd = rangeEnd;
  }

  return config;
}

function syncOrganizerButtons(buttons, selectedValues) {
  const selected = new Set(selectedValues);

  buttons.forEach((button) => {
    const isActive = selected.has(button.dataset.builderOrganizer);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncDateFields(mode, fields) {
  fields.singleDateField.hidden = mode !== "custom_date";
  fields.rangeStartField.hidden = mode !== "custom_range";
  fields.rangeEndField.hidden = mode !== "custom_range";
}