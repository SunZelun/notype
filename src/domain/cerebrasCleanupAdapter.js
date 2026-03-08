import { API_ENDPOINTS, buildApiUrl, normalizeBaseUrl } from "../config/constants";
import { ContextMetadataProvider } from "./contextMetadataProvider";
import { buildCleanupMessages } from "./promptBuilder";

function extractMessageText(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (entry?.type === "text" && typeof entry.text === "string") {
          return entry.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function buildCerebrasCleanupRequest({
  apiKey,
  transcript,
  model = "gpt-oss-120b",
  baseUrl = API_ENDPOINTS.CEREBRAS_BASE,
  contextMetadata = {},
  preferredLanguage,
  customDictionary = [],
  candidateId,
  languageInstruction,
  systemPrompt,
}) {
  const endpoint = buildApiUrl(
    normalizeBaseUrl(baseUrl) || API_ENDPOINTS.CEREBRAS_BASE,
    "/chat/completions"
  );

  return {
    endpoint,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: buildCleanupMessages({
          transcript,
          contextMetadata,
          preferredLanguage,
          customDictionary,
          candidateId,
          languageInstruction,
          systemPrompt,
        }),
      }),
    },
  };
}

export class CerebrasCleanupAdapter {
  constructor({
    fetchImpl,
    getApiKey,
    getBaseUrl,
    getModel,
    contextMetadataProvider,
    getPreferredLanguage,
    getCustomDictionary,
    getPromptCandidateId,
  } = {}) {
    this.fetchImpl =
      fetchImpl || (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
    this.getApiKey = getApiKey;
    this.getBaseUrl = getBaseUrl;
    this.getModel = getModel;
    this.contextMetadataProvider = contextMetadataProvider || new ContextMetadataProvider();
    this.getPreferredLanguage = getPreferredLanguage;
    this.getCustomDictionary = getCustomDictionary;
    this.getPromptCandidateId = getPromptCandidateId;
  }

  async cleanup(transcript, promptOptions = {}) {
    const apiKey = await this.getApiKey?.();
    if (!apiKey) {
      throw new Error("Cerebras API key not found. Add it in Settings or the local .env file.");
    }
    if (!this.fetchImpl) {
      throw new Error("Fetch is unavailable in this environment.");
    }

    const contextMetadata = await this.contextMetadataProvider.getContextMetadata();
    const preferredLanguage =
      promptOptions.preferredLanguage ?? (await this.getPreferredLanguage?.()) ?? undefined;
    const customDictionary =
      promptOptions.customDictionary ?? (await this.getCustomDictionary?.()) ?? [];
    const candidateId = promptOptions.candidateId ?? (await this.getPromptCandidateId?.());
    const request = buildCerebrasCleanupRequest({
      apiKey,
      transcript,
      model: (await this.getModel?.()) || "gpt-oss-120b",
      baseUrl: (await this.getBaseUrl?.()) || API_ENDPOINTS.CEREBRAS_BASE,
      contextMetadata,
      preferredLanguage,
      customDictionary,
      candidateId,
      languageInstruction: promptOptions.languageInstruction,
      systemPrompt: promptOptions.systemPrompt,
    });

    const response = await this.fetchImpl(request.endpoint, request.init);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Cerebras cleanup failed: ${response.status} ${detail}`.trim());
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const text = extractMessageText(content);
    if (!text) {
      throw new Error("Cerebras cleanup returned empty text.");
    }

    return {
      text,
      contextMetadata,
      raw: payload,
    };
  }
}
