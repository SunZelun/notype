import { deriveContextClass } from "./contextClassification.mjs";

export class ContextMetadataProvider {
  constructor({ electronApi } = {}) {
    this.electronApi = electronApi ?? (typeof window !== "undefined" ? window.electronAPI : null);
  }

  async getContextMetadata() {
    try {
      const raw = (await this.electronApi?.getActiveAppMetadata?.()) || {};
      return {
        appName: raw.appName || "",
        bundleId: raw.bundleId || "",
        windowTitle: raw.windowTitle || "",
        contextClass: deriveContextClass(raw),
      };
    } catch {
      return {
        appName: "",
        bundleId: "",
        windowTitle: "",
        contextClass: "general",
      };
    }
  }
}
