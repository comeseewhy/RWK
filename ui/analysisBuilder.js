// ui/analysisBuilder.js

import { createRenderConfig } from "../config/renderConfig.schema.js";

const MONTH_LABELS = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
]);

let builderState = createEmptyBuilderState();
let builderDateIndex = createEmptyDateIndex();

export function renderAnalysisBuilder(runtimeData = null) {
  builderState = createEmptyBuilderState();
  builderDateIndex = buildDateIndex(runtimeData);

  return `
    <section class="launcher-builder" aria-labelledby="analysisBuilderTitle">
      <div class="launcher-section-heading">
        <p class="launcher-section-heading__eyebrow">Builder</p>
        <h2 id="analysisBuilderTitle" class="launcher-section-heading__title">
          Build a time frame
        </h2>
        <p class="launcher-section-heading__description">
          Select one year, optionally narrow to one month, then optionally choose
          one or more dates. Save the time frame here, then use View map above.
        </p>
      </div>

      <div class="launcher-builder__tree">
        <div class="launcher-field">
          <span class="launcher-label">Year</span>
          <div
            id="builderYearGroup"
            class="launcher-chip-group launcher-chip-group--tree"
            aria-label="Available years"
          >
            ${renderYearButtons()}
          </div>
        </div>

        <div class="launcher-field" id="builderMonthField" hidden>
          <span class="launcher-label">Month</span>
          <div
            id="builderMonthGroup"
            class="launcher-chip-group launcher-chip-group--tree"
            aria-label="Available months"
          ></div>
        </div>

        <div class="launcher-field" id="builderDateField" hidden>
          <span class="launcher-label">Date</span>
          <div
            id="builderDateGroup"
            class="launcher-chip-group launcher-chip-group--dates"
            aria-label="Available dates grouped by week"
          ></div>
        </div>
      </div>

      <div
        id="builderSelectionSummary"
        class="launcher-builder__summary"
        aria-live="polite"
      >
        No time frame selected yet.
      </div>

      <div class="launcher-builder__actions">
        <button
          id="builderSaveButton"
          class="button button--primary launcher-builder__save"
          type="button"
          disabled
        >
          Save time frame
        </button>

        <button
          id="builderClearButton"
          class="button"
          type="button"
        >
          Clear selection
        </button>
      </div>

      <p id="builderFeedback" class="launcher-feedback" aria-live="polite"></p>
    </section>
  `;
}

export function bindAnalysisBuilder() {
  const yearGroup = document.getElementById("builderYearGroup");
  const monthField = document.getElementById("builderMonthField");
  const monthGroup = document.getElementById("builderMonthGroup");
  const dateField = document.getElementById("builderDateField");
  const dateGroup = document.getElementById("builderDateGroup");
  const saveButton = document.getElementById("builderSaveButton");
  const clearButton = document.getElementById("builderClearButton");
  const summary = document.getElementById("builderSelectionSummary");
  const feedback = document.getElementById("builderFeedback");

  yearGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-builder-year]");
    if (!button) return;

    const nextYear = button.dataset.builderYear || "";

    builderState.year = builderState.year === nextYear ? "" : nextYear;
    builderState.month = "";
    builderState.dates = [];
    builderState.savedConfig = null;

    if (feedback) {
      feedback.textContent = "";
    }

    syncBuilderUi();
  });

  monthGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-builder-month]");
    if (!button) return;

    const nextMonth = button.dataset.builderMonth || "";

    builderState.month = builderState.month === nextMonth ? "" : nextMonth;
    builderState.dates = [];
    builderState.savedConfig = null;

    if (feedback) {
      feedback.textContent = "";
    }

    syncBuilderUi();
  });

  dateGroup?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-builder-date]");
    if (!button) return;

    toggleDate(button.dataset.builderDate || "");
    builderState.savedConfig = null;

    if (feedback) {
      feedback.textContent = "";
    }

    syncBuilderUi();
  });

  saveButton?.addEventListener("click", () => {
    try {
      const config = buildTimeFrameRenderConfig(builderState);
      builderState.savedConfig = config;

      if (feedback) {
        feedback.textContent = `Time frame saved: ${config.meta.label}. Use View map to open this subset.`;
      }

      syncBuilderUi();
    } catch (error) {
      if (feedback) {
        feedback.textContent = error.message;
      }
    }
  });

  clearButton?.addEventListener("click", () => {
    builderState = createEmptyBuilderState();

    if (feedback) {
      feedback.textContent = "Time frame selection cleared. View map will open all activity.";
    }

    syncBuilderUi();
  });

  syncBuilderUi();

  function syncBuilderUi() {
    syncActiveButtons(yearGroup, "builderYear", [builderState.year]);

    const availableMonths = builderState.year
      ? builderDateIndex.monthsByYear.get(builderState.year) || []
      : [];

    if (monthField) {
      monthField.hidden = !builderState.year || availableMonths.length === 0;
    }

    if (monthGroup) {
      monthGroup.innerHTML = renderMonthButtons(builderState.year, availableMonths);
      syncActiveButtons(monthGroup, "builderMonth", [builderState.month]);
    }

    const dateKey =
      builderState.year && builderState.month
        ? `${builderState.year}-${builderState.month}`
        : "";

    const availableDates = dateKey
      ? builderDateIndex.datesByYearMonth.get(dateKey) || []
      : [];

    if (dateField) {
      dateField.hidden = !builderState.year || !builderState.month || availableDates.length === 0;
    }

    if (dateGroup) {
      dateGroup.innerHTML = renderDateButtons(dateKey, availableDates);
      syncActiveButtons(dateGroup, "builderDate", builderState.dates);
    }

    if (saveButton) {
      saveButton.disabled = !builderState.year || Boolean(builderState.savedConfig);
      saveButton.textContent = builderState.savedConfig
        ? "Time frame saved"
        : "Save time frame";
    }

    if (summary) {
      summary.innerHTML = buildSelectionSummaryHtml();
    }
  }
}

export function getSavedTimeFrameConfig() {
  return builderState.savedConfig || null;
}

export function buildTimeFrameRenderConfig(state = builderState) {
  const safeYear = String(state.year || "").trim();
  const safeMonth = normalizeMonth(state.month);
  const safeDates = Array.isArray(state.dates)
    ? [...state.dates].filter(Boolean).sort()
    : [];

  if (!safeYear) {
    throw new Error("Select a year before saving a time frame.");
  }

  const label = buildConfigLabel({
    year: safeYear,
    month: safeMonth,
    dates: safeDates
  });

  const description = buildConfigDescription({
    year: safeYear,
    month: safeMonth,
    dates: safeDates
  });

  return createRenderConfig({
    meta: {
      presetId: "TIME_FRAME_BUILDER",
      selectionPath: "builder/time-frame",
      label,
      description
    },
    filters: {
      year: safeYear,
      month: safeMonth,
      dates: safeDates
    },
    visualization: {
      showMap: true,
      showBoundaries: true,
      showJobs: true,
      showOrigins: true,
      fitToVisible: false
    },
    analytics: {
      mode: "time_frame",
      groupBy: safeDates.length > 0 ? "date" : safeMonth ? "day" : "month",
      sortBy: "date"
    }
  });
}

function createEmptyBuilderState() {
  return {
    year: "",
    month: "",
    dates: [],
    savedConfig: null
  };
}

function createEmptyDateIndex() {
  return {
    years: [],
    monthsByYear: new Map(),
    datesByYearMonth: new Map(),
    counts: new Map()
  };
}

function buildDateIndex(runtimeData) {
  const rows = getRuntimeRows(runtimeData);
  const years = new Set();
  const monthsByYear = new Map();
  const datesByYearMonth = new Map();
  const counts = new Map();

  rows.forEach((row) => {
    const parts = getRowDateParts(row);
    if (!parts) return;

    years.add(parts.year);

    if (!monthsByYear.has(parts.year)) {
      monthsByYear.set(parts.year, new Set());
    }

    monthsByYear.get(parts.year).add(parts.month);

    const yearMonthKey = `${parts.year}-${parts.month}`;

    if (!datesByYearMonth.has(yearMonthKey)) {
      datesByYearMonth.set(yearMonthKey, new Set());
    }

    datesByYearMonth.get(yearMonthKey).add(parts.isoDate);

    incrementCount(counts, `year:${parts.year}`);
    incrementCount(counts, `month:${yearMonthKey}`);
    incrementCount(counts, `date:${parts.isoDate}`);
  });

  return {
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    monthsByYear: mapSetValues(monthsByYear, (values) =>
      [...values].sort((a, b) => Number(a) - Number(b))
    ),
    datesByYearMonth: mapSetValues(datesByYearMonth, (values) =>
      [...values].sort()
    ),
    counts
  };
}

function getRuntimeRows(runtimeData) {
  if (!runtimeData || typeof runtimeData !== "object") {
    return [];
  }

  if (Array.isArray(runtimeData.candidateRows)) {
    return runtimeData.candidateRows;
  }

  if (Array.isArray(runtimeData.derivedRows)) {
    return runtimeData.derivedRows;
  }

  if (Array.isArray(runtimeData.joinedRows)) {
    return runtimeData.joinedRows;
  }

  if (Array.isArray(runtimeData.exportRows)) {
    return runtimeData.exportRows;
  }

  if (Array.isArray(runtimeData.eventsRows)) {
    return runtimeData.eventsRows;
  }

  return [];
}

function getRowDateParts(row) {
  const date = getRowDate(row);

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = String(date.getFullYear());
  const month = normalizeMonth(date.getMonth() + 1);
  const day = normalizeDay(date.getDate());
  const isoDate = `${year}-${month}-${day}`;

  return {
    year,
    month,
    day,
    isoDate
  };
}

function getRowDate(row) {
  if (row?._parsedDate instanceof Date && !Number.isNaN(row._parsedDate.getTime())) {
    return row._parsedDate;
  }

  const raw =
    row?._dateValue ||
    row?.date ||
    row?.start_date ||
    row?.event_date ||
    row?.start_time ||
    row?.created_at ||
    row?.updated_at ||
    "";

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function renderYearButtons() {
  if (builderDateIndex.years.length === 0) {
    return `
      <span class="launcher-builder__empty">
        No dated records were found in the loaded runtime.
      </span>
    `;
  }

  return builderDateIndex.years
    .map((year) =>
      renderChipButton({
        datasetKey: "builderYear",
        value: year,
        label: year,
        count: getCount(`year:${year}`)
      })
    )
    .join("");
}

function renderMonthButtons(year, months) {
  if (!year || !Array.isArray(months) || months.length === 0) {
    return "";
  }

  return months
    .map((month) =>
      renderChipButton({
        datasetKey: "builderMonth",
        value: month,
        label: MONTH_LABELS[Number(month) - 1] || month,
        count: getCount(`month:${year}-${month}`)
      })
    )
    .join("");
}

function renderDateButtons(yearMonthKey, dates) {
  if (!yearMonthKey || !Array.isArray(dates) || dates.length === 0) {
    return "";
  }

  const weekGroups = groupDatesByWeek(dates);

  return weekGroups
    .map((group) => {
      const chips = group.dates
        .map((isoDate) => {
          const date = new Date(`${isoDate}T00:00:00`);
          const label = Number.isNaN(date.getTime())
            ? isoDate
            : new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
              }).format(date);

          return renderChipButton({
            datasetKey: "builderDate",
            value: isoDate,
            label,
            count: getCount(`date:${isoDate}`)
          });
        })
        .join("");

      return `
        <section class="launcher-date-week" aria-label="${escapeHtml(group.label)}">
          <div class="launcher-date-week__heading">${escapeHtml(group.label)}</div>
          <div class="launcher-date-week__chips">
            ${chips}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderChipButton({ datasetKey, value, label, count }) {
  return `
    <button
      class="launcher-chip launcher-chip--date-tree"
      type="button"
      data-${camelToKebab(datasetKey)}="${escapeHtml(value)}"
      aria-pressed="false"
    >
      <span class="launcher-chip__label">${escapeHtml(label)}</span>
      <span class="launcher-chip__count">${Number(count || 0).toLocaleString()}</span>
    </button>
  `;
}

function groupDatesByWeek(dates) {
  const groups = new Map();

  dates.forEach((isoDate) => {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;

    const weekStart = getWeekStartMonday(date);
    const weekKey = toIsoDate(weekStart);
    const label = `Week of ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric"
    }).format(weekStart)}`;

    if (!groups.has(weekKey)) {
      groups.set(weekKey, {
        key: weekKey,
        label,
        dates: []
      });
    }

    groups.get(weekKey).dates.push(isoDate);
  });

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function getWeekStartMonday(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);

  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);

  return copy;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = normalizeMonth(date.getMonth() + 1);
  const day = normalizeDay(date.getDate());
  return `${year}-${month}-${day}`;
}

function buildSelectionSummaryHtml() {
  const parts = [];

  if (builderState.year) {
    parts.push(`<strong>${escapeHtml(builderState.year)}</strong>`);
  }

  if (builderState.month) {
    const monthLabel = MONTH_LABELS[Number(builderState.month) - 1] || builderState.month;
    parts.push(`<strong>${escapeHtml(monthLabel)}</strong>`);
  }

  if (builderState.dates.length > 0) {
    parts.push(`<strong>${builderState.dates.length} selected date${builderState.dates.length === 1 ? "" : "s"}</strong>`);
  }

  if (parts.length === 0) {
    return "No time frame selected yet.";
  }

  const count = getCurrentSelectionCount();
  const savedNote = builderState.savedConfig
    ? `<span class="launcher-builder__summary-saved">Saved for View map.</span>`
    : `<span class="launcher-builder__summary-meta">Not saved yet.</span>`;

  return `
    <span>${parts.join(" / ")}</span>
    <span class="launcher-builder__summary-meta">
      ${count.toLocaleString()} matching record${count === 1 ? "" : "s"} before map-side refinements.
    </span>
    ${savedNote}
  `;
}

function getCurrentSelectionCount() {
  if (!builderState.year) {
    return 0;
  }

  if (builderState.dates.length > 0) {
    return builderState.dates.reduce(
      (total, isoDate) => total + getCount(`date:${isoDate}`),
      0
    );
  }

  if (builderState.month) {
    return getCount(`month:${builderState.year}-${builderState.month}`);
  }

  return getCount(`year:${builderState.year}`);
}

function buildConfigLabel({ year, month, dates }) {
  if (dates.length > 0) {
    return `${year} ${MONTH_LABELS[Number(month) - 1] || month}: ${dates.length} selected date${dates.length === 1 ? "" : "s"}`;
  }

  if (month) {
    return `${MONTH_LABELS[Number(month) - 1] || month} ${year}`;
  }

  return `${year}`;
}

function buildConfigDescription({ year, month, dates }) {
  if (dates.length > 0) {
    return `Launcher-defined time frame for ${dates.length} selected date${dates.length === 1 ? "" : "s"} in ${MONTH_LABELS[Number(month) - 1] || month} ${year}.`;
  }

  if (month) {
    return `Launcher-defined time frame for all available records in ${MONTH_LABELS[Number(month) - 1] || month} ${year}.`;
  }

  return `Launcher-defined time frame for all available records in ${year}.`;
}

function toggleDate(isoDate) {
  if (!isoDate) return;

  const index = builderState.dates.indexOf(isoDate);

  if (index >= 0) {
    builderState.dates.splice(index, 1);
  } else {
    builderState.dates.push(isoDate);
  }

  builderState.dates.sort();
}

function syncActiveButtons(container, datasetKey, selectedValues) {
  if (!container) return;

  const selected = new Set((selectedValues || []).filter(Boolean));
  const selector = `[data-${camelToKebab(datasetKey)}]`;

  container.querySelectorAll(selector).forEach((button) => {
    const isActive = selected.has(button.dataset[datasetKey]);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function getCount(key) {
  return builderDateIndex.counts.get(key) || 0;
}

function incrementCount(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function mapSetValues(sourceMap, transform) {
  const result = new Map();

  sourceMap.forEach((value, key) => {
    result.set(key, transform(value));
  });

  return result;
}

function normalizeMonth(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1 || number > 12) {
    return "";
  }

  return String(number).padStart(2, "0");
}

function normalizeDay(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1 || number > 31) {
    return "";
  }

  return String(number).padStart(2, "0");
}

function camelToKebab(value) {
  return String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}