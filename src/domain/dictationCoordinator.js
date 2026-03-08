import { resolveDictationOutput } from "./dictationPolicy";
import { HistoryRepository } from "./historyRepository";
import { SettingsRepository } from "./settingsRepository";

export class DictationCoordinator {
  constructor({
    historyRepository = new HistoryRepository(),
    settingsRepository = new SettingsRepository(),
    writeClipboard,
    pasteText,
    saveHistory,
  } = {}) {
    this.historyRepository = historyRepository;
    this.settingsRepository = settingsRepository;
    this.writeClipboard =
      writeClipboard ||
      (async (text) => {
        return window.electronAPI?.writeClipboard?.(text);
      });
    this.pasteText = pasteText || (async () => false);
    this.saveHistory =
      saveHistory ||
      (async (text, rawText) => {
        return this.historyRepository.save(text, rawText);
      });
  }

  async handleTranscriptionResult(result, pasteOptions = {}) {
    const output = resolveDictationOutput(result);
    const finalText = output.finalText || output.rawTranscript;

    if (!finalText) {
      return {
        skipped: true,
        finalText: "",
        cleanupFailed: Boolean(output.cleanupFailed),
        pasted: false,
        pasteFailed: false,
      };
    }

    const autoPasteEnabled = this.settingsRepository.isAutoPasteEnabled();
    const shouldAutoPaste = output.shouldAutoPaste && autoPasteEnabled;

    let pasted = false;
    let pasteFailed = false;

    if (shouldAutoPaste) {
      pasted = Boolean(await this.pasteText(output.clipboardText, pasteOptions));
      if (!pasted) {
        pasteFailed = true;
        await this.writeClipboard(output.clipboardText);
      }
    } else {
      await this.writeClipboard(output.clipboardText);
    }

    let historySaved = true;
    let historyError = "";

    try {
      const historyResult = await this.saveHistory(
        output.clipboardText,
        result.rawText ?? output.clipboardText
      );
      if (historyResult === false || historyResult?.success === false) {
        historySaved = false;
        historyError =
          typeof historyResult?.error === "string" && historyResult.error.trim()
            ? historyResult.error.trim()
            : "Could not save dictation history.";
      }
    } catch (error) {
      historySaved = false;
      historyError =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Could not save dictation history.";
    }

    return {
      skipped: false,
      finalText: output.clipboardText,
      rawTranscript: output.rawTranscript,
      cleanupFailed: Boolean(output.cleanupFailed),
      pasted,
      pasteFailed,
      shouldAutoPaste,
      showCleanupFailureToast: Boolean(output.cleanupFailed) && !shouldAutoPaste,
      historySaved,
      historyError,
    };
  }
}
