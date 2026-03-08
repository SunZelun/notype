import crypto from "crypto";
import fs from "fs";
import path from "path";
import { buildCleanupSystemPromptFromPolicy, listPromptCandidates } from "../../src/domain/promptPolicy.mjs";

const DEFAULT_GROQ_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_CEREBRAS_BASE = "https://api.cerebras.ai/v1";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForScore(text) {
  return normalizeText(text)
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase();
}

function tokenize(text) {
  return normalizeForScore(text)
    .split(/[^a-z0-9_./:@+-]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildCountMap(tokens) {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function overlapCount(aTokens, bTokens) {
  const aCounts = buildCountMap(aTokens);
  const bCounts = buildCountMap(bTokens);
  let overlap = 0;
  for (const [token, count] of aCounts.entries()) {
    overlap += Math.min(count, bCounts.get(token) || 0);
  }
  return overlap;
}

function literalTokens(text) {
  return tokenize(text).filter((token) => /[A-Z0-9_./:@+-]/.test(token) || token.length >= 12);
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

export function scorePromptOutput({ referenceText, candidateText }) {
  const reference = normalizeForScore(referenceText);
  const candidate = normalizeForScore(candidateText);
  const referenceTokens = tokenize(referenceText);
  const candidateTokens = tokenize(candidateText);
  const overlap = overlapCount(referenceTokens, candidateTokens);
  const precision = candidateTokens.length === 0 ? 0 : overlap / candidateTokens.length;
  const recall = referenceTokens.length === 0 ? 0 : overlap / referenceTokens.length;
  const tokenF1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const editDistance = levenshteinDistance(reference, candidate);
  const maxLen = Math.max(reference.length, candidate.length, 1);
  const charSimilarity = 1 - editDistance / maxLen;

  const referenceLiteralTokens = literalTokens(referenceText);
  const literalOverlap = overlapCount(referenceLiteralTokens, candidateTokens);
  const literalRecall =
    referenceLiteralTokens.length === 0 ? 1 : literalOverlap / referenceLiteralTokens.length;

  const referenceLength = Math.max(referenceTokens.length, 1);
  const candidateLength = candidateTokens.length;
  const lengthRatio = Math.min(referenceLength, Math.max(candidateLength, 1)) /
    Math.max(referenceLength, Math.max(candidateLength, 1));

  const metaViolation =
    /^(cleaned text|output|result|here(?:'|’)s|here is|sure[,!:]|certainly[,!:])/i.test(
      normalizeText(candidateText)
    );
  const outputContractScore = metaViolation ? 0 : 1;

  const compositeScore =
    charSimilarity * 35 +
    tokenF1 * 30 +
    literalRecall * 20 +
    lengthRatio * 10 +
    outputContractScore * 5;

  return {
    compositeScore: Number(compositeScore.toFixed(2)),
    charSimilarity: Number((charSimilarity * 100).toFixed(2)),
    tokenF1: Number((tokenF1 * 100).toFixed(2)),
    literalRecall: Number((literalRecall * 100).toFixed(2)),
    lengthRatio: Number((lengthRatio * 100).toFixed(2)),
    outputContractScore: Number((outputContractScore * 100).toFixed(2)),
    metaViolation,
  };
}

function buildLanguageInstruction(language) {
  if (!language || language === "auto") {
    return "";
  }
  return `Prefer the final output in ${language} unless the dictated content clearly mixes languages.`;
}

function getMimeType(audioPath) {
  const ext = path.extname(audioPath).toLowerCase();
  if (ext === ".ogg" || ext === ".oga") return "audio/ogg";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  return "application/octet-stream";
}

export async function transcribeAudioWithGroq({
  audioPath,
  apiKey,
  model = "whisper-large-v3-turbo",
  baseUrl = DEFAULT_GROQ_BASE,
  language,
} = {}) {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for prompt benchmarking.");
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const blob = new Blob([audioBuffer], { type: getMimeType(audioPath) });
  const formData = new FormData();
  formData.append("file", blob, path.basename(audioPath));
  formData.append("model", model);
  if (language && language !== "auto") {
    formData.append("language", language);
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Groq transcription failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return normalizeText(payload?.text);
}

export async function cleanupWithCerebras({
  transcript,
  systemPrompt,
  apiKey,
  model = "gpt-oss-120b",
  baseUrl = DEFAULT_CEREBRAS_BASE,
} = {}) {
  if (!apiKey) {
    throw new Error("CUSTOM_REASONING_API_KEY or CEREBRAS_API_KEY is required for prompt benchmarking.");
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Cerebras cleanup failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return normalizeText(Array.isArray(content) ? content.map((part) => part?.text || "").join("") : content);
}

function buildTranscriptCacheKey(sample, groqModel) {
  return crypto
    .createHash("sha1")
    .update(`${sample.id}|${sample.audioPath}|${sample.preferredLanguage || ""}|${groqModel}`)
    .digest("hex");
}

function loadJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMarkdownSummary({ benchmarkName, sampleCount, rankings }) {
  const lines = [
    `# ${benchmarkName}`,
    "",
    `Samples: ${sampleCount}`,
    "",
    "| Rank | Candidate | Avg Score | Exact-ish | Meta Violations |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  rankings.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.candidateId} | ${item.avgCompositeScore.toFixed(2)} | ${item.highConfidenceMatches} | ${item.metaViolations} |`
    );
  });

  return lines.join("\n") + "\n";
}

export async function runPromptBenchmark({
  dataset,
  candidateIds,
  dryRun = false,
  outDir = path.join("tmp", "prompt-eval", "latest"),
  transcriptCachePath = path.join("tmp", "prompt-eval", "transcript-cache.json"),
  groqApiKey = process.env.GROQ_API_KEY,
  cerebrasApiKey = process.env.CUSTOM_REASONING_API_KEY || process.env.CEREBRAS_API_KEY,
  groqModel = "whisper-large-v3-turbo",
  cleanupModel = "gpt-oss-120b",
  groqBaseUrl = DEFAULT_GROQ_BASE,
  cerebrasBaseUrl = DEFAULT_CEREBRAS_BASE,
} = {}) {
  const availableCandidates = new Map(listPromptCandidates().map((candidate) => [candidate.id, candidate]));
  const selectedCandidateIds =
    candidateIds && candidateIds.length > 0
      ? candidateIds.filter((candidateId) => availableCandidates.has(candidateId))
      : listPromptCandidates().map((candidate) => candidate.id);

  if (selectedCandidateIds.length === 0) {
    throw new Error("No valid prompt candidates selected.");
  }

  const samples = dataset.filter((sample) => sample.referenceText && sample.audioExists !== false);
  const transcriptCache = loadJsonFile(transcriptCachePath, {});
  const detailedResults = [];

  for (const sample of samples) {
    const cacheKey = buildTranscriptCacheKey(sample, groqModel);
    let rawTranscript = normalizeText(sample.rawTranscript) || normalizeText(transcriptCache[cacheKey]);

    if (!rawTranscript && !dryRun) {
      rawTranscript = await transcribeAudioWithGroq({
        audioPath: sample.audioPath,
        apiKey: groqApiKey,
        model: groqModel,
        baseUrl: groqBaseUrl,
        language: sample.preferredLanguage,
      });
      transcriptCache[cacheKey] = rawTranscript;
    }

    const candidateRuns = [];
    for (const candidateId of selectedCandidateIds) {
      const systemPrompt = buildCleanupSystemPromptFromPolicy({
        candidateId,
        contextMetadata: sample.contextMetadata,
        languageInstruction: buildLanguageInstruction(sample.preferredLanguage),
      });

      if (dryRun) {
        candidateRuns.push({
          candidateId,
          systemPromptPreview: systemPrompt.slice(0, 220),
        });
        continue;
      }

      const candidateText = await cleanupWithCerebras({
        transcript: rawTranscript,
        systemPrompt,
        apiKey: cerebrasApiKey,
        model: cleanupModel,
        baseUrl: cerebrasBaseUrl,
      });

      candidateRuns.push({
        candidateId,
        systemPromptPreview: systemPrompt.slice(0, 220),
        outputText: candidateText,
        score: scorePromptOutput({
          referenceText: sample.referenceText,
          candidateText,
        }),
      });
    }

    detailedResults.push({
      id: sample.id,
      audioPath: sample.audioPath,
      referenceText: sample.referenceText,
      rawTranscript,
      contextMetadata: sample.contextMetadata,
      preferredLanguage: sample.preferredLanguage,
      candidateRuns,
    });
  }

  if (!dryRun) {
    writeJsonFile(transcriptCachePath, transcriptCache);
  }

  const rankings = selectedCandidateIds.map((candidateId) => {
    const allRuns = detailedResults
      .flatMap((sample) => sample.candidateRuns)
      .filter((candidateRun) => candidateRun.candidateId === candidateId);
    const scoredRuns = allRuns.filter((candidateRun) => candidateRun.score);
    const scores = scoredRuns.map((run) => run.score.compositeScore);

    return {
      candidateId,
      avgCompositeScore: average(scores),
      highConfidenceMatches: scoredRuns.filter((run) => run.score.compositeScore >= 92).length,
      metaViolations: scoredRuns.filter((run) => run.score.metaViolation).length,
      sampleCount: allRuns.length,
    };
  }).sort((a, b) => b.avgCompositeScore - a.avgCompositeScore);

  const benchmarkName = dryRun ? "Prompt Benchmark Dry Run" : "Prompt Benchmark";
  const summary = {
    benchmarkName,
    dryRun,
    sampleCount: detailedResults.length,
    groqModel,
    cleanupModel,
    rankings,
  };

  fs.mkdirSync(outDir, { recursive: true });
  writeJsonFile(path.join(outDir, "summary.json"), summary);
  writeJsonFile(path.join(outDir, "results.json"), detailedResults);
  fs.writeFileSync(
    path.join(outDir, "summary.md"),
    buildMarkdownSummary({ benchmarkName, sampleCount: detailedResults.length, rankings }),
    "utf8"
  );

  return { summary, detailedResults };
}
