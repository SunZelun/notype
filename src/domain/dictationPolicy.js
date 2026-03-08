export function resolveDictationOutput(result) {
  const cleanedText = typeof result?.text === "string" ? result.text.trim() : "";
  const rawTranscript =
    typeof result?.rawText === "string" && result.rawText.trim()
      ? result.rawText.trim()
      : cleanedText;
  const cleanupStatus = result?.cleanupStatus || "cleaned";
  const cleanupFailed = cleanupStatus === "raw_fallback";
  const clipboardText = cleanupFailed ? rawTranscript : cleanedText;

  return {
    cleanupFailed,
    cleanupStatus,
    clipboardText,
    rawTranscript,
    finalText: cleanedText,
    shouldAutoPaste: !cleanupFailed && clipboardText.length > 0,
    cleanupError:
      typeof result?.cleanupError === "string" && result.cleanupError.trim()
        ? result.cleanupError.trim()
        : "",
  };
}
