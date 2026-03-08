import { describe, expect, it } from "vitest";
import { resolveDictationOutput } from "../../src/domain/dictationPolicy";

describe("resolveDictationOutput", () => {
  it("auto-pastes cleaned output when cleanup succeeds", () => {
    const result = resolveDictationOutput({
      text: "Cleaned sentence.",
      rawText: "um cleaned sentence",
      cleanupStatus: "cleaned",
    });

    expect(result.clipboardText).toBe("Cleaned sentence.");
    expect(result.shouldAutoPaste).toBe(true);
    expect(result.cleanupFailed).toBe(false);
  });

  it("keeps the raw transcript on the clipboard and skips auto-paste when cleanup fails", () => {
    const result = resolveDictationOutput({
      text: "um raw transcript",
      rawText: "um raw transcript",
      cleanupStatus: "raw_fallback",
      cleanupError: "Cerebras timed out",
    });

    expect(result.clipboardText).toBe("um raw transcript");
    expect(result.shouldAutoPaste).toBe(false);
    expect(result.cleanupFailed).toBe(true);
    expect(result.cleanupError).toBe("Cerebras timed out");
  });
});
