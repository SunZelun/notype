import { API_ENDPOINTS, buildApiUrl, normalizeBaseUrl } from "../config/constants";

function getFileExtension(mimeType = "") {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function buildGroqTranscriptionRequest({
  audioBlob,
  apiKey,
  language,
  model = "whisper-large-v3-turbo",
  prompt,
  baseUrl = API_ENDPOINTS.GROQ_BASE,
}) {
  const endpoint = buildApiUrl(normalizeBaseUrl(baseUrl) || API_ENDPOINTS.GROQ_BASE, "/audio/transcriptions");
  const formData = new FormData();
  const extension = getFileExtension(audioBlob?.type || "");

  formData.append("file", audioBlob, `audio.${extension}`);
  formData.append("model", model);
  if (language && language !== "auto") {
    formData.append("language", language);
  }
  if (prompt) {
    formData.append("prompt", prompt);
  }

  return {
    endpoint,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  };
}

export class GroqTranscriptionAdapter {
  constructor({ fetchImpl, getApiKey, getBaseUrl, getModel } = {}) {
    this.fetchImpl =
      fetchImpl || (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
    this.getApiKey = getApiKey;
    this.getBaseUrl = getBaseUrl;
    this.getModel = getModel;
  }

  async transcribe(audioBlob, { language, prompt } = {}) {
    const apiKey = await this.getApiKey?.();
    if (!apiKey) {
      throw new Error("Groq API key not found. Add it in Settings or the local .env file.");
    }
    if (!this.fetchImpl) {
      throw new Error("Fetch is unavailable in this environment.");
    }

    const request = buildGroqTranscriptionRequest({
      audioBlob,
      apiKey,
      language,
      prompt,
      model: (await this.getModel?.()) || "whisper-large-v3-turbo",
      baseUrl: (await this.getBaseUrl?.()) || API_ENDPOINTS.GROQ_BASE,
    });

    const response = await this.fetchImpl(request.endpoint, request.init);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Groq transcription failed: ${response.status} ${detail}`.trim());
    }

    const payload = await response.json();
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    if (!text) {
      throw new Error("Groq transcription returned empty text.");
    }

    return {
      text,
      raw: payload,
    };
  }
}
