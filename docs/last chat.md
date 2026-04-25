Okay, the last chat revolved around visual updates, and they were completed pretty appropriately. They seemed to work really well. The zoom is great, or good enough anyway. So I'd like to flip back to the launcher. I just want to hone in on two aspects here. The first block, the operational launcher block, I just don't think it's necessary to have that description, and I also don't like the title operational launcher. I think let's just remove the entire, like, descriptive text and just change the type, change the blocks so that it only contains RWK and then the title, and let's change the title from operational launcher to maybe perhaps client map. Yeah, client map. That'll be fine. It's really just something that describes it in one phrase, what this project is about. Client map. But then I wanna hone in on the builder, specifically, well, I guess the buttons and as they relate to the map. So the builder block is quite good, however, I think, especially on mobile view, but in general, it's not a very user-friendly decision tree for selecting dates. I think when I go through the options, by the time, especially when I'm on mobile, by the time I get to the date tree, the fields are just categorized one, like two at a time, two per row, and scrolling down. I guess it would be helpful to break them up into like week by week in some way, like a line break in between each week or something of the sort. I just think that there could be a more intuitive and helpful way to sort of break down the analysis. But then when it comes to the button itself, the button functionality, I don't want two buttons to view the map. Currently, the builder has a button that says save timeframe and view map. And then when you use the builder button, it opens that specific subset of data. Rather, I would like the blue, the main button on the builder block to be save timeframe, and then once I click that, the decision tree, all of the choices the user made are saved, and the button, maybe the text in the button changes from save timeframe to timeframe saved. And then the only button that can be used At that point in the building block would be clear selection, and then that removes the decision tree and it starts fresh. But essentially, the functionality should be that the user uses view map, and if there's no time frame saved in the building block, in the builder block, then the entire population is opened. And if there is a block saved, or like a time frame saved in the builder block, then only that subset opens. But view map should be sourced or housed in specifically one location. So I am going to have to ask for your help revitalizing that to Just make the date decision tree a little more user-friendly and to make sure that the operational map itself is, like the view map button is housed in just the map block, and that the description changes to be more relevant for the map block itself, and then the description is removed altogether for the RWK block and the title is changed. Can you help map out or like plan how these changes would be made? Thank you for your help.

---

Yes. This is a clean launcher-only phase. Based on the current export, the relevant files are ui/launcherShell.js, ui/analysisBuilder.js, and styles/04-launcher.css; possibly styles/09-responsive.css for small mobile overrides.

Intended design update

The launcher should become:

Hero block
Eyebrow: RWK
Title: Client map
No descriptive paragraph.
Map block
The only place with a View map button.
Description should explain:
Opens all records if no saved builder time frame exists.
Opens the saved time-frame subset if one has been saved.
Builder block
Used only to prepare/save a time frame.
Primary button changes from Save time frame and view map to Save time frame.
Clicking it saves the config but does not open the map.
After saving, button state changes to something like Time frame saved.
Clear selection resets the builder and removes the saved builder config.
Dates should be visually grouped by week for easier mobile scanning.
Functional change

Current flow:

builder selection → Save time frame and view map → workspace opens immediately

New flow:

builder selection → Save time frame → View map button opens selected subset

Or:

no builder selection → View map button opens all activity

File-level plan
ui/launcherShell.js

Change the hero markup:

<h1 class="launcher-hero__title">Client map</h1>

Remove the hero subtitle entirely.

Update the map card description to clarify that View map is the single map entry point.

Change bindStaticLauncherEvents() so the map button checks whether the builder has a saved config. If yes, launch that. If not, launch buildAllActivityPreset().

This file should no longer receive onLaunch(config) from the builder. Instead, it should receive a saved-builder callback or query the builder’s saved config.

ui/analysisBuilder.js

Change the builder button label:

Save time frame
Give feedback

Change button behavior:

Build the time-frame config.
Store it in builderState.savedConfig.
Update feedback.
Do not call onLaunch.

Expose a helper such as:

export function getSavedTimeFrameConfig() {
  return builderState.savedConfig;
}

Also update clear behavior so it sets:

builderState.savedConfig = null;

Improve date rendering by grouping dates by ISO week. Instead of rendering one long wrap-grid of date chips, renderDateButtons() should return grouped blocks like:

<div class="launcher-date-week">
  <div class="launcher-date-week__heading">Week of Apr 6</div>
  <div class="launcher-date-week__chips">...</div>
</div>
Give feedback
styles/04-launcher.css

Add styles for the week grouping:

.launcher-date-week {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #eef2f7;
  border-radius: var(--radius-md);
  background: rgba(248, 250, 252, 0.72);
}

.launcher-date-week__heading {
  font-size: 0.78rem;
  font-weight: 850;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.launcher-date-week__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

Also adjust .launcher-chip-group--dates so it becomes a vertical grouped list instead of only a wrapping chip container.

Testing checklist

After replacement:

Launcher hero says RWK and Client map.
Hero has no description.
Map block has the only View map button.
Builder button says Save time frame.
Saving a builder selection does not open the map.
Button/feedback confirms the time frame was saved.
View map opens the saved time-frame subset.
Clear selection resets the builder.
After clearing, View map opens all activity.
Date options are grouped by week and easier to scan on mobile.

Next best implementation cut: comprehensively replace ui/analysisBuilder.js, ui/launcherShell.js, and styles/04-launcher.css.

---

Okay, I have attached the context for the plan. Can you help me comprehensively update all files related to this batch of updates?

---

Yes — this batch should replace these three files fully:

ui/analysisBuilder.js
ui/launcherShell.js
styles/04-launcher.css

This implements the launcher hero rename, removes the hero description, makes View map the only workspace launch button, changes the builder into a save-only flow, and groups date choices by week for better mobile scanning.

Because the full files are long, I’ll provide them in the next message as complete replacement versions.

---

Sounds good. Can you begin providing them in this next message?

---

Yes. Begin with these two full replacements.

ui/launcherShell.js
// ui/launcherShell.js

import { buildAllActivityPreset } from "../config/presets.js";
import {
  bindAnalysisBuilder,
  getSavedTimeFrameConfig,
  renderAnalysisBuilder
} from "./analysisBuilder.js";
import { clearConfig, setConfig } from "../state/session.js";

export async function renderLauncherShell(rootId = "landing-root", options = {}) {
  const {
    runtimeData = null,
    runtimeProgress = null,
    onOpenWorkspace = null
  } = options;

  const root = document.getElementById(rootId);

  if (!root) {
    throw new Error(`Launcher root #${rootId} not found.`);
  }

  root.innerHTML = buildLauncherMarkup(runtimeData, runtimeProgress);
  bindStaticLauncherEvents(root, { onOpenWorkspace });

  setViewMapDisabled(!runtimeData);

  bindAnalysisBuilder();
}

function buildLauncherMarkup(runtimeData = null, runtimeProgress = null) {
  const summary = getRuntimeSummary(runtimeData);
  const progress = normalizeRuntimeProgress(runtimeProgress, runtimeData);
  const isReady = Boolean(runtimeData);
  const isError = progress.step === "error";

  return `
    <section class="launcher-shell">
      <aside
        id="launcherRuntimeRail"
        class="launcher-runtime-rail ${isReady ? "is-ready" : ""} ${isError ? "is-error" : ""}"
        aria-label="Runtime initialization status"
      >
        <div class="launcher-runtime-rail__track" aria-hidden="true">
          <span
            id="launcherRuntimeRailFill"
            class="launcher-runtime-rail__fill"
            style="width: ${escapeHtml(String(progress.percent))}%"
          ></span>
        </div>

        <div class="launcher-runtime-rail__content">
          <span class="launcher-runtime-rail__status">
            <span class="launcher-runtime-rail__dot" aria-hidden="true"></span>
            <span id="launcherRuntimeRailLabel">${escapeHtml(progress.label)}</span>
          </span>

          <span class="launcher-runtime-rail__meta">
            ${renderRuntimeRailMeta(summary, isReady)}
          </span>
        </div>
      </aside>

      <header class="launcher-hero">
        <p class="launcher-hero__kicker">RWK</p>
        <h1 class="launcher-hero__title">Client map</h1>
      </header>

      <section class="launcher-entry-card" aria-labelledby="viewMapTitle">
        <div class="launcher-section-heading">
          <p class="launcher-section-heading__eyebrow">Map</p>
          <h2 id="viewMapTitle" class="launcher-section-heading__title">
            View map
          </h2>
          <p class="launcher-section-heading__description">
            Open the full current map, or save a time frame below first to open
            the map with that subset already applied.
          </p>
        </div>

        <button
          id="viewMapButton"
          class="button button--primary launcher-view-map-button"
          type="button"
          ${isReady ? "" : "disabled"}
        >
          View map
        </button>
      </section>

      ${renderAnalysisBuilder(runtimeData)}
    </section>
  `;
}

function bindStaticLauncherEvents(root, options = {}) {
  const viewMapButton = root.querySelector("#viewMapButton");

  viewMapButton?.addEventListener("click", () => {
    const savedTimeFrameConfig = getSavedTimeFrameConfig();
    launchWithConfig(savedTimeFrameConfig || buildAllActivityPreset(), options);
  });
}

function launchWithConfig(config, options = {}) {
  try {
    clearConfig();
    setConfig(config);

    if (typeof options.onOpenWorkspace === "function") {
      options.onOpenWorkspace(config);
      return;
    }

    window.location.href = "./workspace.html";
  } catch (error) {
    console.error("[RWK] failed to launch workspace:", error);
  }
}

function setViewMapDisabled(disabled) {
  const button = document.getElementById("viewMapButton");
  if (button) {
    button.disabled = disabled;
  }

  const builderButton = document.getElementById("builderSaveButton");
  if (builderButton && disabled) {
    builderButton.disabled = true;
  }
}

function renderRuntimeRailMeta(summary, isReady) {
  if (!isReady) {
    return "Map access unlocks when runtime is ready.";
  }

  return [
    `${summary.eventsCount.toLocaleString()} events`,
    `${summary.joinedCount.toLocaleString()} joined`,
    `${summary.candidateCount.toLocaleString()} coordinate-valid`,
    summary.updatedAt ? `updated ${formatRuntimeTimestamp(summary.updatedAt)}` : ""
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
}

function normalizeRuntimeProgress(progress, runtimeData) {
  if (runtimeData) {
    return {
      step: "complete",
      label: "Runtime ready",
      percent: 100
    };
  }

  return {
    step: progress?.step || "starting",
    label: progress?.label || "Initializing runtime...",
    percent: Number.isFinite(progress?.percent) ? progress.percent : 0
  };
}

function getRuntimeSummary(runtimeData) {
  if (!runtimeData || typeof runtimeData !== "object") {
    return {
      eventsCount: 0,
      joinedCount: 0,
      candidateCount: 0,
      updatedAt: ""
    };
  }

  const summary = runtimeData.summary || {};

  return {
    eventsCount: Number.isFinite(summary.eventsCount) ? summary.eventsCount : 0,
    joinedCount: Number.isFinite(summary.joinedCount) ? summary.joinedCount : 0,
    candidateCount: Number.isFinite(summary.candidateCount) ? summary.candidateCount : 0,
    updatedAt: summary.updatedAt || runtimeData.manifest?.updated_at || ""
  };
}

function formatRuntimeTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
ui/analysisBuilder.js
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

These two handle the launcher flow and builder logic. The plan specifically called for these files plus styles/04-launcher.css; I’ll provide the CSS replacement next.

---

Okay, thank you. I've updated the first two files. I'm ready for the styles 04-launcher.css file update. Thank you.

---

Below is the full replacement for styles/04-launcher.css.

.launcher-shell {
  width: min(1180px, calc(100% - 28px));
  margin: 0 auto;
  padding: 28px 0 40px;
  display: grid;
  gap: 24px;
}

/* Runtime rail */

.launcher-runtime-rail {
  position: sticky;
  top: 12px;
  z-index: 20;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.94);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(14px);
}

.launcher-runtime-rail__track {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 100%);
}

.launcher-runtime-rail__fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  border-radius: inherit;
  background:
    linear-gradient(90deg, rgba(29, 78, 216, 0.9), rgba(59, 130, 246, 0.92)),
    linear-gradient(90deg, #dbeafe, #bfdbfe);
  transition: width 420ms ease;
}

.launcher-runtime-rail__content {
  position: relative;
  z-index: 1;
  min-height: 54px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launcher-runtime-rail__status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
  font-size: 0.9rem;
  font-weight: 850;
  color: #0f172a;
}

.launcher-runtime-rail__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #94a3b8;
  box-shadow: 0 0 0 5px rgba(148, 163, 184, 0.16);
}

.launcher-runtime-rail__meta {
  overflow: hidden;
  text-align: right;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.launcher-runtime-rail.is-ready {
  border-color: rgba(29, 78, 216, 0.25);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__dot {
  background: var(--color-primary);
  box-shadow: 0 0 0 5px rgba(29, 78, 216, 0.14);
}

.launcher-runtime-rail.is-ready .launcher-runtime-rail__status {
  color: var(--color-primary-strong);
}

.launcher-runtime-rail.is-error {
  border-color: rgba(185, 28, 28, 0.32);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__fill {
  background: linear-gradient(90deg, #991b1b, #dc2626);
}

.launcher-runtime-rail.is-error .launcher-runtime-rail__dot {
  background: var(--color-danger);
  box-shadow: 0 0 0 5px rgba(185, 28, 28, 0.14);
}

/* Hero */

.launcher-hero {
  padding: 28px;
  border: 1px solid rgba(29, 78, 216, 0.12);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: var(--shadow-soft);
}

.launcher-hero__kicker {
  margin: 0 0 8px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-hero__title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1.05;
}

.launcher-hero__subtitle {
  max-width: 780px;
  margin: 12px 0 0;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--color-muted);
}

/* Cards */

.launcher-entry-card,
.launcher-group,
.launcher-builder {
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.launcher-entry-card {
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at top right, rgba(29, 78, 216, 0.1), transparent 34%),
    var(--color-surface);
}

.launcher-view-map-button {
  width: fit-content;
  min-width: 180px;
  justify-self: start;
  font-weight: 800;
}

.launcher-section-heading__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.launcher-section-heading__title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
}

.launcher-section-heading__description {
  margin: 8px 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-feedback {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--color-muted);
}

/* Legacy launcher cards retained for compatibility */

.launcher-groups {
  display: grid;
  gap: 22px;
}

.launcher-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.launcher-card {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  min-height: 176px;
  padding: 18px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-card--button {
  cursor: pointer;
}

.launcher-card--button:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(29, 78, 216, 0.25);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.launcher-card--button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.launcher-card__body {
  display: grid;
  gap: 10px;
}

.launcher-card__title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.launcher-card__description {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--color-muted);
}

.launcher-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.launcher-card__meta {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: 0.82rem;
  font-weight: 700;
}

/* Builder */

.launcher-builder {
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at top left, rgba(29, 78, 216, 0.08), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.launcher-builder__tree {
  display: grid;
  gap: 18px;
  margin-top: 2px;
}

.launcher-builder__summary {
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border: 1px solid rgba(29, 78, 216, 0.14);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  color: var(--color-text);
  font-size: 0.92rem;
  line-height: 1.4;
}

.launcher-builder__summary-meta {
  color: var(--color-muted);
  font-size: 0.84rem;
  font-weight: 600;
}

.launcher-builder__summary-saved {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: var(--color-success);
  font-size: 0.8rem;
  font-weight: 850;
  line-height: 1.1;
}

.launcher-builder__empty {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px dashed var(--color-border-strong);
  border-radius: 999px;
  color: var(--color-muted);
  background: var(--color-surface-muted);
  font-size: 0.88rem;
  line-height: 1.35;
}

.launcher-builder__save {
  min-width: 220px;
  font-weight: 800;
}

.launcher-builder__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.launcher-builder__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 0;
}

/* Fields */

.launcher-field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.launcher-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-muted);
}

.launcher-input {
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.launcher-input::placeholder {
  color: #8a97a6;
}

.launcher-input:hover {
  border-color: var(--color-border-strong);
}

.launcher-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
}

/* Chips */

.launcher-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.launcher-chip-group--tree {
  align-items: stretch;
}

.launcher-chip-group--dates {
  display: grid;
  gap: 12px;
  max-height: 300px;
  overflow: auto;
  padding: 2px 4px 4px 2px;
}

.launcher-chip {
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.launcher-chip:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
}

.launcher-chip.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.08);
}

.launcher-chip--date-tree {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  font-weight: 700;
}

.launcher-chip__label {
  line-height: 1.1;
}

.launcher-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  min-height: 22px;
  padding: 3px 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1;
}

.launcher-chip.is-active .launcher-chip__count {
  background: #ffffff;
  color: var(--color-primary-strong);
}

/* Date week groups */

.launcher-date-week {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #eef2f7;
  border-radius: var(--radius-md);
  background: rgba(248, 250, 252, 0.72);
}

.launcher-date-week__heading {
  font-size: 0.78rem;
  font-weight: 850;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.launcher-date-week__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Responsive */

@media (max-width: 720px) {
  .launcher-shell {
    width: min(100% - 20px, 1180px);
    padding: 18px 0 30px;
    gap: 18px;
  }

  .launcher-runtime-rail {
    top: 8px;
    border-radius: var(--radius-lg);
  }

  .launcher-runtime-rail__content {
    min-height: 70px;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .launcher-runtime-rail__meta {
    width: 100%;
    text-align: left;
    white-space: normal;
  }

  .launcher-hero,
  .launcher-entry-card,
  .launcher-group,
  .launcher-builder {
    padding: 18px;
    border-radius: var(--radius-lg);
  }

  .launcher-hero {
    padding-block: 20px;
  }

  .launcher-builder__grid {
    grid-template-columns: 1fr;
  }

  .launcher-view-map-button,
  .launcher-builder__save,
  .launcher-builder__actions .button {
    width: 100%;
  }

  .launcher-builder__actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .launcher-chip-group--dates {
    max-height: 340px;
  }

  .launcher-date-week {
    padding: 9px;
  }

  .launcher-date-week__chips {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .launcher-date-week__chips .launcher-chip {
    width: 100%;
    justify-content: space-between;
    padding-inline: 10px;
  }
}

@media (max-width: 420px) {
  .launcher-runtime-rail__status {
    min-width: 0;
  }

  .launcher-hero__title {
    font-size: 1.65rem;
  }

  .launcher-section-heading__title {
    font-size: 1.08rem;
  }

  .launcher-section-heading__description {
    font-size: 0.9rem;
  }

  .launcher-chip-group--dates {
    max-height: 360px;
  }

  .launcher-date-week__chips {
    grid-template-columns: 1fr;
  }
}

This completes the launcher batch: the first two JS files handle the behavior, and this CSS update handles the revised launcher layout plus week-grouped date selection styling.