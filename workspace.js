// workspace.js

import { createWorkspaceController } from "./workspace/controller.js";

const controller = createWorkspaceController();

document.addEventListener("DOMContentLoaded", () => {
  controller.init();
});