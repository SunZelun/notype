import { getSettings } from "../stores/settingsStore";

export class SettingsRepository {
  constructor({ getSnapshot = getSettings } = {}) {
    this.getSnapshot = getSnapshot;
  }

  getSettings() {
    return this.getSnapshot();
  }

  isAutoPasteEnabled() {
    return this.getSnapshot().autoPasteEnabled !== false;
  }

  getPreferredLanguage() {
    return this.getSnapshot().preferredLanguage || "auto";
  }

  getCustomDictionary() {
    return this.getSnapshot().customDictionary || [];
  }

  getTranscriptionModel() {
    return this.getSnapshot().cloudTranscriptionModel || "whisper-large-v3-turbo";
  }

  getCleanupModel() {
    return this.getSnapshot().reasoningModel || "gpt-oss-120b";
  }

  getCleanupBaseUrl() {
    return this.getSnapshot().cloudReasoningBaseUrl || "";
  }

  getTranscriptionBaseUrl() {
    return this.getSnapshot().cloudTranscriptionBaseUrl || "";
  }
}
