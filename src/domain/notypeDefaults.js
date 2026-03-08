import { API_ENDPOINTS } from "../config/constants";

export const NOTYPE_SETTINGS_DEFAULTS = {
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
};

export function getNotypeSettingsPatch(settings = {}) {
  return Object.entries(NOTYPE_SETTINGS_DEFAULTS).reduce((patch, [key, value]) => {
    if (settings[key] !== value) {
      patch[key] = value;
    }
    return patch;
  }, {});
}
