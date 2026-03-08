import { describe, expect, it } from "vitest";
import {
  normalizeTypelessHistoryRow,
} from "../../scripts/lib/typelessDataset.mjs";
import { scorePromptOutput } from "../../scripts/lib/promptEval.mjs";

describe("prompt evaluation helpers", () => {
  it("scores closer outputs above lower-fidelity outputs", () => {
    const referenceText = "Run npm test and then update promptBuilder.js.";
    const closeScore = scorePromptOutput({
      referenceText,
      candidateText: "Run npm test and then update promptBuilder.js.",
    });
    const farScore = scorePromptOutput({
      referenceText,
      candidateText: "Here is a cleaned summary of your request.",
    });

    expect(closeScore.compositeScore).toBeGreaterThan(farScore.compositeScore);
    expect(farScore.metaViolation).toBe(true);
  });

  it("normalizes Typeless history rows into benchmark samples", () => {
    const sample = normalizeTypelessHistoryRow(
      {
        id: "sample-id",
        created_at: "2026-03-08T06:35:21.656Z",
        status: "transcript",
        mode: "voice_transcript",
        focused_app_name: "Warp",
        focused_app_bundle_id: "dev.warp.Warp-Stable",
        focused_app_window_title: "notype prompt benchmark",
        detected_language: "en",
        refined_text: "Run npm test before shipping.",
        audio_local_path: "/tmp/sample.ogg",
      },
      "/tmp"
    );

    expect(sample.id).toBe("sample-id");
    expect(sample.referenceText).toBe("Run npm test before shipping.");
    expect(sample.contextMetadata.contextClass).toBe("terminal");
    expect(sample.audioPath).toBe("/tmp/sample.ogg");
  });
});
