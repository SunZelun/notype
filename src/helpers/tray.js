const { Tray, Menu, nativeImage, app } = require("electron");
const path = require("path");
const fs = require("fs");
const debugLogger = require("./debugLogger");
class TrayManager {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
    this.settingsWindow = null;
    this.windowManager = null;
    this.attachedSettingsWindows = new WeakSet();
  }

  setWindows(mainWindow, settingsWindow) {
    this.mainWindow = mainWindow;
    this.settingsWindow = settingsWindow;

    if (this.mainWindow) {
      this.mainWindow.on("show", () => this.updateTrayMenu?.());
      this.mainWindow.on("hide", () => this.updateTrayMenu?.());
      this.mainWindow.on("minimize", () => this.updateTrayMenu?.());
      this.mainWindow.on("restore", () => this.updateTrayMenu?.());
    }

    if (this.settingsWindow) {
      this.attachSettingsWindowListeners(this.settingsWindow);
    }

    this.updateTrayMenu?.();
  }

  setWindowManager(windowManager) {
    this.windowManager = windowManager;
  }

  setCreateSettingsCallback(callback) {
    this.createSettingsCallback = callback;
  }

  attachSettingsWindowListeners(window) {
    if (!window || this.attachedSettingsWindows.has(window)) {
      return;
    }

    this.attachedSettingsWindows.add(window);

    window.on("show", () => {
      this.updateTrayMenu?.();
    });

    window.on("hide", () => {
      this.updateTrayMenu?.();
    });

    window.on("destroyed", () => {
      this.settingsWindow = null;
      this.updateTrayMenu?.();
    });
  }

  async showSettingsFromTray() {
    try {
      if (this.windowManager) {
        this.settingsWindow = this.windowManager.settingsWindow || this.settingsWindow;
      }
      this.attachSettingsWindowListeners(this.settingsWindow);

      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        if (process.platform === "darwin" && app.dock) {
          app.dock.show();
        }
        if (this.settingsWindow.isMinimized()) {
          this.settingsWindow.restore();
        }
        if (!this.settingsWindow.isVisible()) {
          this.settingsWindow.show();
        }
        this.settingsWindow.focus();
        if (this.settingsWindow.webContents.isCrashed()) {
          this.settingsWindow.webContents.reload();
        }
        return;
      }

      if (this.createSettingsCallback) {
        await this.createSettingsCallback();
        if (this.windowManager) {
          this.settingsWindow = this.windowManager.settingsWindow || this.settingsWindow;
        }
        this.attachSettingsWindowListeners(this.settingsWindow);

        if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
          this.settingsWindow.show();
          this.settingsWindow.focus();
        }
        return;
      }

      debugLogger.error("No settings window callback available", undefined, "tray");
    } catch (error) {
      debugLogger.error("Failed to open settings window", { error: error?.message }, "tray");
    }
  }

  async createTray() {
    try {
      const trayIcon = await this.loadTrayIcon();
      if (!trayIcon || trayIcon.isEmpty()) {
        debugLogger.error("Failed to load tray icon", undefined, "tray");
        return;
      }

      this.tray = new Tray(trayIcon);

      if (process.platform === "darwin") {
        this.tray.setIgnoreDoubleClickEvents(true);
      }

      this.updateTrayMenu();
      this.setupTrayEventHandlers();
    } catch (error) {
      debugLogger.error("Error creating tray icon", { error: error.message }, "tray");
    }
  }

  async loadTrayIcon() {
    const platform = process.platform;
    const isDevelopment = process.env.NODE_ENV === "development";

    const candidatePaths = [];

    if (platform === "darwin") {
      if (isDevelopment) {
        candidatePaths.push(path.join(__dirname, "..", "assets", "iconTemplate@3x.png"));
      } else {
        candidatePaths.push(
          path.join(process.resourcesPath, "src", "assets", "iconTemplate@3x.png"),
          path.join(process.resourcesPath, "assets", "iconTemplate@3x.png"),
          path.join(
            process.resourcesPath,
            "app.asar.unpacked",
            "src",
            "assets",
            "iconTemplate@3x.png"
          ),
          path.join(__dirname, "..", "..", "src", "assets", "iconTemplate@3x.png"),
          path.join(app.getAppPath(), "src", "assets", "iconTemplate@3x.png")
        );
      }
    } else {
      const fileName = platform === "win32" ? "icon.ico" : "icon.png";
      if (isDevelopment) {
        candidatePaths.push(
          path.join(__dirname, "..", "assets", fileName),
          path.join(__dirname, "..", "assets", "icon.png")
        );
      } else {
        candidatePaths.push(
          path.join(process.resourcesPath, "src", "assets", fileName),
          path.join(process.resourcesPath, "assets", fileName),
          path.join(process.resourcesPath, "app.asar.unpacked", "src", "assets", fileName),
          path.join(__dirname, "..", "..", "src", "assets", fileName),
          path.join(app.getAppPath(), "src", "assets", fileName)
        );
      }
    }

    for (const testPath of candidatePaths) {
      try {
        if (fs.existsSync(testPath)) {
          const icon = nativeImage.createFromPath(testPath);
          if (icon && !icon.isEmpty()) {
            if (platform === "darwin") {
              icon.setTemplateImage(true);
            }
            debugLogger.debug("Using tray icon", { path: testPath }, "tray");
            return icon;
          }
        }
      } catch (error) {
        debugLogger.error(
          "Error checking tray icon path",
          { path: testPath, error: error.message },
          "tray"
        );
      }
    }

    debugLogger.error("Could not find tray icon in any expected location", undefined, "tray");
    return this.createFallbackIcon();
  }

  createFallbackIcon() {
    try {
      // Create a simple 16x16 PNG icon programmatically
      const { createCanvas } = require("canvas");
      const canvas = createCanvas(16, 16);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, 2 * Math.PI);
      ctx.fill();

      const buffer = canvas.toBuffer("image/png");
      const fallbackIcon = nativeImage.createFromBuffer(buffer);
      debugLogger.info("Created fallback tray icon", undefined, "tray");
      return fallbackIcon;
    } catch (fallbackError) {
      debugLogger.warn("Canvas not available, creating minimal fallback icon", undefined, "tray");
      // Create a minimal 16x16 black square PNG as fallback
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x91, 0x68, 0x36, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x28, 0x53, 0x63, 0x08,
        0x05, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const fallbackIcon = nativeImage.createFromBuffer(pngData);
      debugLogger.info("Created minimal fallback tray icon", undefined, "tray");
      return fallbackIcon;
    }
  }

  buildContextMenuTemplate() {
    const dictationVisible = this.windowManager?.isDictationPanelVisible?.() ?? false;

    return [
      {
        label: dictationVisible
          ? "Hide Dictation Bubble"
          : "Show Dictation Bubble",
        click: () => {
          if (!this.windowManager) return;
          if (this.windowManager.isDictationPanelVisible()) {
            this.windowManager.hideDictationPanel();
          } else {
            this.windowManager.showDictationPanel({ focus: true });
          }
          this.updateTrayMenu();
        },
      },
      {
        label: "Open Settings",
        click: async () => {
          await this.showSettingsFromTray();
        },
      },
      { type: "separator" },
      {
        label: "Quit NOTYPE",
        click: () => {
          debugLogger.info("Quitting app via tray menu", undefined, "tray");
          app.quit();
        },
      },
    ];
  }

  updateTrayMenu() {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate(this.buildContextMenuTemplate());
    this.tray.setToolTip("NOTYPE");
    this.tray.setContextMenu(contextMenu);
  }

  setupTrayEventHandlers() {
    if (!this.tray) {
      return;
    }

    if (process.platform !== "darwin") {
      this.tray.on("click", () => {
        void this.showSettingsFromTray();
      });
    }

    this.tray.on("destroyed", () => {
      debugLogger.debug("Tray icon destroyed", undefined, "tray");
      this.tray = null;
    });
  }
}

module.exports = TrayManager;
