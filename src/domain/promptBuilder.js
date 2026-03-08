import { getLanguageInstruction } from "../utils/languageSupport";
import {
  buildCleanupSystemPromptFromPolicy,
  getDefaultPromptCandidateId,
} from "./promptPolicy.mjs";

export function resolvePromptCandidateId(explicitCandidateId) {
  if (explicitCandidateId) {
    return explicitCandidateId;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("notypePromptCandidate");
    if (stored) {
      return stored;
    }
  }

  return getDefaultPromptCandidateId();
}

export function buildCleanupSystemPrompt(
  contextMetadata = {},
  {
    preferredLanguage,
    customDictionary = [],
    candidateId,
    languageInstruction,
  } = {}
) {
  return buildCleanupSystemPromptFromPolicy({
    candidateId: resolvePromptCandidateId(candidateId),
    contextMetadata,
    languageInstruction:
      typeof languageInstruction === "string"
        ? languageInstruction
        : getLanguageInstruction(preferredLanguage),
    customDictionary,
  });
}

export function buildCleanupMessages({
  transcript,
  contextMetadata = {},
  preferredLanguage,
  customDictionary = [],
  candidateId,
  languageInstruction,
  systemPrompt,
}) {
  return [
    {
      role: "system",
      content:
        systemPrompt ||
        buildCleanupSystemPrompt(contextMetadata, {
          preferredLanguage,
          customDictionary,
          candidateId,
          languageInstruction,
        }),
    },
    {
      role: "user",
      content: transcript,
    },
  ];
}
