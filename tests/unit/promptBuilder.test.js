import { describe, expect, it } from "vitest";
import { buildCleanupMessages, buildCleanupSystemPrompt } from "../../src/domain/promptBuilder";

describe("promptBuilder", () => {
  it("includes structured context, language, and dictionary guidance", () => {
    const systemPrompt = buildCleanupSystemPrompt({
      contextClass: "code_editor",
      appName: "Cursor",
      bundleId: "com.todesktop.230313mzl4w4u92",
      windowTitle: "notype/audioManager.js",
    }, {
      preferredLanguage: "en",
      customDictionary: ["NOTYPE", "Cerebras"],
    });

    expect(systemPrompt).toContain("You clean dictated speech for immediate paste.");
    expect(systemPrompt).toContain("CONTEXTUAL GUIDANCE");
    expect(systemPrompt).toContain("LANGUAGE GUIDANCE");
    expect(systemPrompt).toContain("CUSTOM DICTIONARY");
    expect(systemPrompt).toContain("Context class: code_editor");
    expect(systemPrompt).toContain("Frontmost app: Cursor");
    expect(systemPrompt).toContain("Bundle identifier: com.todesktop.230313mzl4w4u92");
  });

  it("builds an OpenAI-compatible message array", () => {
    const messages = buildCleanupMessages({
      transcript: "um can you clean this sentence",
      contextMetadata: { contextClass: "general", appName: "Notes" },
      preferredLanguage: "en",
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("OUTPUT CONTRACT");
    expect(messages[1]).toEqual({
      role: "user",
      content: "um can you clean this sentence",
    });
  });
});
