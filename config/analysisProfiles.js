export const ANALYSIS_PROFILE_GROUPS = Object.freeze([
  {
    id: "quick-start",
    title: "Quick start",
    description: "A small set of useful entry points for the current operational phase.",
    items: [
      {
        id: "overview-all-activity",
        type: "preset",
        label: "All activity overview",
        description: "Open the broad operational population first, then refine inside the workspace.",
        selectionPath: "overview/all-activity"
      },
      {
        id: "overview-upcoming-installs",
        type: "preset",
        label: "Upcoming installs",
        description: "Start from upcoming install activity and inspect by boundary, day, and origin.",
        selectionPath: "jobs/install/upcoming"
      },
      {
        id: "sites-high-repeat",
        type: "preset",
        label: "High-repeat sites",
        description: "Surface repeat-visit locations for quick concentration review.",
        selectionPath: "sites/high-repeat"
      }
    ]
  }
]);

export const ANALYSIS_BUILDER_DATE_MODES = Object.freeze([
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "custom_date", label: "Custom date" },
  { value: "custom_range", label: "Custom range" }
]);

export const ANALYSIS_BUILDER_ORGANIZER_OPTIONS = Object.freeze([
  { value: "install", label: "Install" },
  { value: "template", label: "Template" }
]);