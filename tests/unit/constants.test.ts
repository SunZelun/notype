import { describe, expect, it } from "vitest";
import { API_ENDPOINTS, buildApiUrl, normalizeBaseUrl } from "../../src/config/constants";

describe("API endpoint helpers", () => {
  it("normalizes OpenAI-compatible endpoint suffixes back to the base URL", () => {
    expect(normalizeBaseUrl("https://api.groq.com/openai/v1/audio/transcriptions")).toBe(
      "https://api.groq.com/openai/v1"
    );
    expect(normalizeBaseUrl("https://api.cerebras.ai/v1/chat/completions")).toBe(
      "https://api.cerebras.ai/v1"
    );
  });

  it("builds URLs from normalized bases", () => {
    expect(buildApiUrl("https://api.cerebras.ai/v1/", "/chat/completions")).toBe(
      "https://api.cerebras.ai/v1/chat/completions"
    );
  });

  it("exposes the fixed NOTYPE provider bases", () => {
    expect(API_ENDPOINTS.GROQ_BASE).toBe("https://api.groq.com/openai/v1");
    expect(API_ENDPOINTS.CEREBRAS_BASE).toBe("https://api.cerebras.ai/v1");
  });
});
