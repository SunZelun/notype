import { describe, expect, it, vi } from "vitest";
import { DictationCoordinator } from "../../src/domain/dictationCoordinator";

describe("DictationCoordinator", () => {
  it("auto-pastes cleaned output and saves history on the happy path", async () => {
    const pasteText = vi.fn().mockResolvedValue(true);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const saveHistory = vi.fn().mockResolvedValue({ id: 1 });
    const coordinator = new DictationCoordinator({
      settingsRepository: { isAutoPasteEnabled: () => true },
      pasteText,
      writeClipboard,
      saveHistory,
    });

    const result = await coordinator.handleTranscriptionResult({
      success: true,
      text: "Cleaned sentence.",
      rawText: "um cleaned sentence",
      cleanupStatus: "cleaned",
    });

    expect(pasteText).toHaveBeenCalledWith("Cleaned sentence.", {});
    expect(writeClipboard).not.toHaveBeenCalled();
    expect(saveHistory).toHaveBeenCalledWith("Cleaned sentence.", "um cleaned sentence");
    expect(result.pasted).toBe(true);
    expect(result.cleanupFailed).toBe(false);
  });

  it("copies the raw transcript and skips auto-paste on cleanup failure", async () => {
    const pasteText = vi.fn().mockResolvedValue(true);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const saveHistory = vi.fn().mockResolvedValue({ id: 2 });
    const coordinator = new DictationCoordinator({
      settingsRepository: { isAutoPasteEnabled: () => true },
      pasteText,
      writeClipboard,
      saveHistory,
    });

    const result = await coordinator.handleTranscriptionResult({
      success: true,
      text: "um raw transcript",
      rawText: "um raw transcript",
      cleanupStatus: "raw_fallback",
      cleanupError: "Cerebras timed out",
    });

    expect(pasteText).not.toHaveBeenCalled();
    expect(writeClipboard).toHaveBeenCalledWith("um raw transcript");
    expect(saveHistory).toHaveBeenCalledWith("um raw transcript", "um raw transcript");
    expect(result.cleanupFailed).toBe(true);
    expect(result.showCleanupFailureToast).toBe(true);
  });

  it("keeps clipboard output when auto-paste fails", async () => {
    const pasteText = vi.fn().mockResolvedValue(false);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const saveHistory = vi.fn().mockResolvedValue({ id: 3 });
    const coordinator = new DictationCoordinator({
      settingsRepository: { isAutoPasteEnabled: () => true },
      pasteText,
      writeClipboard,
      saveHistory,
    });

    const result = await coordinator.handleTranscriptionResult({
      success: true,
      text: "Paste me",
      rawText: "paste me",
      cleanupStatus: "cleaned",
    });

    expect(pasteText).toHaveBeenCalledWith("Paste me", {});
    expect(writeClipboard).toHaveBeenCalledWith("Paste me");
    expect(result.pasteFailed).toBe(true);
  });

  it("reports history save failures without blocking the dictation result", async () => {
    const pasteText = vi.fn().mockResolvedValue(true);
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const saveHistory = vi.fn().mockResolvedValue(false);
    const coordinator = new DictationCoordinator({
      settingsRepository: { isAutoPasteEnabled: () => true },
      pasteText,
      writeClipboard,
      saveHistory,
    });

    const result = await coordinator.handleTranscriptionResult({
      success: true,
      text: "Saved to clipboard",
      rawText: "saved to clipboard",
      cleanupStatus: "cleaned",
    });

    expect(result.historySaved).toBe(false);
    expect(result.historyError).toBe("Could not save dictation history.");
    expect(pasteText).toHaveBeenCalledWith("Saved to clipboard", {});
  });
});
