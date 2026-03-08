import { afterEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "../../src/config/constants";
import {
  buildCerebrasCleanupRequest,
  CerebrasCleanupAdapter,
} from "../../src/domain/cerebrasCleanupAdapter";
import {
  buildGroqTranscriptionRequest,
  GroqTranscriptionAdapter,
} from "../../src/domain/groqTranscriptionAdapter";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("provider adapters", () => {
  it("builds the Groq transcription request against the fixed audio endpoint", () => {
    const request = buildGroqTranscriptionRequest({
      audioBlob: new Blob(["audio"], { type: "audio/webm" }),
      apiKey: "groq-key",
      language: "en",
      prompt: "OpenAI, Cerebras, NOTYPE",
      model: "whisper-large-v3-turbo",
      baseUrl: API_ENDPOINTS.GROQ_BASE,
    });

    expect(request.endpoint).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers.Authorization).toBe("Bearer groq-key");
  });

  it("builds the Cerebras cleanup request against the chat completions endpoint", async () => {
    const request = buildCerebrasCleanupRequest({
      apiKey: "cerebras-key",
      transcript: "um clean this transcript",
      model: "gpt-oss-120b",
      baseUrl: API_ENDPOINTS.CEREBRAS_BASE,
      contextMetadata: {
        contextClass: "document",
        appName: "Notes",
        bundleId: "com.apple.Notes",
      },
    });

    expect(request.endpoint).toBe("https://api.cerebras.ai/v1/chat/completions");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers.Authorization).toBe("Bearer cerebras-key");

    const body = JSON.parse(request.init.body);
    expect(body.model).toBe("gpt-oss-120b");
    expect(body.messages[0].content).toContain("METADATA-ONLY CONTEXT HINT");
    expect(body.messages[1].content).toBe("um clean this transcript");
  });

  it("binds the default fetch implementation to globalThis for Groq requests", async () => {
    const fetchSpy = vi.fn(function () {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: "transcribed" }),
      });
    });
    globalThis.fetch = fetchSpy;

    const adapter = new GroqTranscriptionAdapter({
      getApiKey: async () => "groq-key",
      getBaseUrl: () => API_ENDPOINTS.GROQ_BASE,
      getModel: () => "whisper-large-v3-turbo",
    });

    const result = await adapter.transcribe(new Blob(["audio"], { type: "audio/webm" }));

    expect(result.text).toBe("transcribed");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("binds the default fetch implementation to globalThis for Cerebras cleanup", async () => {
    const fetchSpy = vi.fn(function () {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "cleaned" } }],
        }),
      });
    });
    globalThis.fetch = fetchSpy;

    const adapter = new CerebrasCleanupAdapter({
      getApiKey: async () => "cerebras-key",
      getBaseUrl: () => API_ENDPOINTS.CEREBRAS_BASE,
      getModel: () => "gpt-oss-120b",
      contextMetadataProvider: {
        getContextMetadata: async () => ({}),
      },
    });

    const result = await adapter.cleanup("rough transcript");

    expect(result.text).toBe("cleaned");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
