/*
  app.js is no longer the live RWK entrypoint.

  The operational runtime now lives in:
  - workspace.html
  - workspace.js

  The launcher entrypoint now lives in:
  - index.html
  - main.js

  Keep this file only as a transitional compatibility marker during refactor.
*/

console.warn(
  "[RWK] app.js is deprecated. Use index.html for the launcher and workspace.html for the map workspace."
);