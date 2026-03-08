const path = require("path");

const isGnomeWayland =
  process.platform === "linux" &&
  process.env.XDG_SESSION_TYPE === "wayland" &&
  /gnome|ubuntu|unity/i.test(process.env.XDG_CURRENT_DESKTOP || "");

const WINDOW_SIZES = {
  BASE: { width: 96, height: 96 },
  WITH_MENU: { width: 240, height: 280 },
  WITH_TOAST: { width: 400, height: 500 },
  EXPANDED: { width: 400, height: 500 },
};

// Main dictation window configuration
const MAIN_WINDOW_CONFIG = {
  width: WINDOW_SIZES.BASE.width,
  height: WINDOW_SIZES.BASE.height,
  title: "NOTYPE",
  webPreferences: {
    preload: path.join(__dirname, "..", "..", "preload.js"),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  },
  frame: false,
  alwaysOnTop: true,
  resizable: false,
  transparent: true,
  show: false,
  skipTaskbar: true,
  focusable: true,
  visibleOnAllWorkspaces: process.platform !== "win32",
  fullScreenable: false,
  hasShadow: false,
  acceptsFirstMouse: true,
  type:
    process.platform === "darwin"
      ? "panel"
      : process.platform === "linux"
        ? isGnomeWayland
          ? "normal"
          : "toolbar"
        : "normal",
};

// Settings window configuration
const SETTINGS_WINDOW_CONFIG = {
  width: 980,
  height: 760,
  backgroundColor: "#f8fafc",
  webPreferences: {
    preload: path.join(__dirname, "..", "..", "preload.js"),
    nodeIntegration: false,
    contextIsolation: true,
    // sandbox: false is required because the preload script bridges IPC
    // between the renderer and main process.
    sandbox: false,
    // webSecurity: false disables same-origin policy. Required because in
    // production the renderer loads from a file:// origin but makes
    // direct cross-origin requests to the configured STT / cleanup APIs.
    webSecurity: false,
    spellcheck: false,
    backgroundThrottling: false,
  },
  title: "NOTYPE Settings",
  resizable: true,
  show: false,
  frame: false,
  ...(process.platform === "darwin" && {
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
  }),
  transparent: false,
  minimizable: true,
  maximizable: true,
  closable: true,
  fullscreenable: true,
  skipTaskbar: false,
  alwaysOnTop: false,
  visibleOnAllWorkspaces: false,
  type: "normal",
};

class WindowPositionUtil {
  static getMainWindowPosition(display, customSize = null, position = "bottom-right") {
    const { width, height } = customSize || WINDOW_SIZES.BASE;
    const MARGIN = 4;
    const workArea = display.workArea || display.bounds;

    let x, y;
    if (position === "bottom-left") {
      x = workArea.x + MARGIN;
      y = Math.max(0, workArea.y + workArea.height - height - MARGIN);
    } else if (position === "center") {
      x = Math.round(workArea.x + (workArea.width - width) / 2);
      y = Math.max(0, workArea.y + workArea.height - height - MARGIN);
    } else {
      // bottom-right (default)
      x = Math.max(0, workArea.x + workArea.width - width - MARGIN);
      y = Math.max(0, workArea.y + workArea.height - height - MARGIN);
    }

    return { x, y, width, height };
  }

  static setupAlwaysOnTop(window) {
    if (process.platform === "darwin") {
      // macOS: Use panel level for proper floating behavior
      // This ensures the window stays on top across spaces and fullscreen apps
      window.setAlwaysOnTop(true, "floating", 1);
      window.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true, // Keep Dock/Command-Tab behaviour
      });
      window.setFullScreenable(false);

      if (window.isVisible()) {
        window.setAlwaysOnTop(true, "floating", 1);
      }
    } else if (process.platform === "win32") {
      window.setAlwaysOnTop(true, "pop-up-menu");
    } else if (isGnomeWayland) {
      window.setAlwaysOnTop(true, "floating");
    } else {
      window.setAlwaysOnTop(true, "screen-saver");
    }
  }
}

module.exports = {
  MAIN_WINDOW_CONFIG,
  SETTINGS_WINDOW_CONFIG,
  WINDOW_SIZES,
  WindowPositionUtil,
};
