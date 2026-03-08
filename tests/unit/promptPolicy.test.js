import { describe, expect, it } from "vitest";
import {
  buildCleanupSystemPromptFromPolicy,
  getDefaultPromptCandidateId,
  listPromptCandidates,
} from "../../src/domain/promptPolicy.mjs";

describe("promptPolicy", () => {
  it("builds the default NOTYPE runtime prompt with contextual guidance", () => {
    const prompt = buildCleanupSystemPromptFromPolicy({
      candidateId: getDefaultPromptCandidateId(),
      contextMetadata: {
        contextClass: "code_editor",
        appName: "Cursor",
        bundleId: "com.todesktop.cursor",
        windowTitle: "promptBuilder.js",
      },
      languageInstruction: "Prefer the final output in English.",
      customDictionary: ["NOTYPE", "gpt-oss-120b"],
    });

    expect(prompt).toContain("ROLE");
    expect(prompt).toContain("CONTEXTUAL GUIDANCE");
    expect(prompt).toContain("Be literal with identifiers");
    expect(prompt).toContain("LANGUAGE GUIDANCE");
    expect(prompt).toContain("CUSTOM DICTIONARY");
    expect(prompt).toContain("Frontmost app: Cursor");
  });

  it("exposes benchmark candidates including the baseline prompt", () => {
    const candidateIds = listPromptCandidates().map((candidate) => candidate.id);
    expect(candidateIds).toContain("baseline-minimal");
    expect(candidateIds).toContain("notype-policy-v1-strict");
    expect(candidateIds).toContain("notype-policy-v2-fidelity");
  });
});
