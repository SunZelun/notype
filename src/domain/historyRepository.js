export class HistoryRepository {
  constructor({ electronApi } = {}) {
    this.electronApi = electronApi ?? (typeof window !== "undefined" ? window.electronAPI : null);
  }

  async save(text, rawText = null) {
    return this.electronApi?.saveTranscription?.(text, rawText) ?? null;
  }

  async list(limit = 50) {
    return this.electronApi?.getTranscriptions?.(limit) ?? [];
  }

  async delete(id) {
    return this.electronApi?.deleteTranscription?.(id) ?? { success: false };
  }
}

