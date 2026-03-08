import { describe, expect, it } from "vitest";
import { API_ENDPOINTS } from "../../src/config/constants";
import { getNotypeSettingsPatch } from "../../src/domain/notypeDefaults";

describe("getNotypeSettingsPatch", () => {
  it("normalizes legacy provider and auth settings to the NOTYPE profile", () => {
    const patch = getNotypeSettingsPatch({
      useLocalWhisper: true,
      preferBuiltInMic: true,
      selectedMicDeviceId: "BuiltInMic",
      cloudTranscriptionProvider: "openai",
      cloudTranscriptionModel: "gpt-4o-mini-transcribe",
      cloudTranscriptionMode: "openwhispr",
      cloudReasoningMode: "openwhispr",
      reasoningProvider: "openai",
      reasoningModel: "gpt-4.1-mini",
      isSignedIn: true,
    });

    expect(patch).toMatchObject({
      useLocalWhisper: false,
      preferBuiltInMic: false,
      selectedMicDeviceId: "",
      cloudTranscriptionProvider: "groq",
      cloudTranscriptionModel: "whisper-large-v3-turbo",
      cloudTranscriptionBaseUrl: API_ENDPOINTS.GROQ_BASE,
      cloudTranscriptionMode: "byok",
      cloudReasoningMode: "byok",
      cloudReasoningBaseUrl: API_ENDPOINTS.CEREBRAS_BASE,
      reasoningProvider: "custom",
      reasoningModel: "gpt-oss-120b",
      isSignedIn: false,
    });
  });

  it("returns an empty patch when the NOTYPE profile is already applied", () => {
    expect(
      getNotypeSettingsPatch({
        useLocalWhisper: false,
        localTranscriptionProvider: "whisper",
        allowOpenAIFallback: false,
        allowLocalFallback: false,
        preferBuiltInMic: false,
        selectedMicDeviceId: "",
        cloudTranscriptionProvider: "groq",
        cloudTranscriptionModel: "whisper-large-v3-turbo",
        cloudTranscriptionBaseUrl: API_ENDPOINTS.GROQ_BASE,
        cloudTranscriptionMode: "byok",
        assemblyAiStreaming: false,
        useReasoningModel: true,
        reasoningModel: "gpt-oss-120b",
        reasoningProvider: "custom",
        cloudReasoningMode: "byok",
        cloudReasoningBaseUrl: API_ENDPOINTS.CEREBRAS_BASE,
        isSignedIn: false,
      })
    ).toEqual({});
  });
});
