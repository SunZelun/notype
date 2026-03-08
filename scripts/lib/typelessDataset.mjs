import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { deriveContextClass } from "../../src/domain/contextClassification.mjs";

export function getDefaultTypelessPaths(homeDir = process.env.HOME || "") {
  const supportDir = path.join(homeDir, "Library", "Application Support", "Typeless");
  return {
    supportDir,
    dbPath: path.join(supportDir, "typeless.db"),
    recordingsDir: path.join(supportDir, "Recordings"),
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTypelessHistoryRow(row, recordingsDir) {
  const appName = normalizeText(row.focused_app_name);
  const bundleId = normalizeText(row.focused_app_bundle_id);
  const windowTitle = normalizeText(row.focused_app_window_title);
  const audioPath =
    normalizeText(row.audio_local_path) || path.join(recordingsDir, `${normalizeText(row.id)}.ogg`);
  const contextMetadata = {
    appName,
    bundleId,
    windowTitle,
  };

  return {
    id: normalizeText(row.id),
    createdAt: normalizeText(row.created_at),
    status: normalizeText(row.status),
    mode: normalizeText(row.mode),
    preferredLanguage: normalizeText(row.detected_language) || undefined,
    referenceText: normalizeText(row.refined_text),
    audioPath,
    audioExists: fs.existsSync(audioPath),
    source: "typeless-history",
    contextMetadata: {
      ...contextMetadata,
      contextClass: deriveContextClass(contextMetadata),
    },
  };
}

export function extractTypelessDataset({
  dbPath = getDefaultTypelessPaths().dbPath,
  recordingsDir = getDefaultTypelessPaths().recordingsDir,
  limit,
  statuses = ["transcript"],
  mode = "voice_transcript",
} = {}) {
  const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
  const statusClause =
    statuses && statuses.length > 0
      ? `and status in (${statuses.map((status) => quote(status)).join(", ")})`
      : "";
  const limitClause = Number.isFinite(limit) && limit > 0 ? `limit ${limit}` : "";
  const sql = `
    select
      id,
      created_at,
      status,
      mode,
      focused_app_name,
      focused_app_bundle_id,
      focused_app_window_title,
      detected_language,
      refined_text,
      audio_local_path
    from history
    where refined_text is not null
      and trim(refined_text) != ''
      and mode = ${quote(mode)}
      ${statusClause}
    order by datetime(created_at) desc
    ${limitClause};
  `;
  const raw = execFileSync("sqlite3", ["-json", dbPath, sql], {
    encoding: "utf8",
  });
  const rows = JSON.parse(raw || "[]");
  return rows.map((row) => normalizeTypelessHistoryRow(row, recordingsDir));
}

export function loadDatasetFile(datasetPath) {
  const raw = fs.readFileSync(datasetPath, "utf8");
  if (datasetPath.endsWith(".jsonl")) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return JSON.parse(raw);
}

export function writeDatasetFile(dataset, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (outPath.endsWith(".jsonl")) {
    const payload = dataset.map((item) => JSON.stringify(item)).join("\n") + "\n";
    fs.writeFileSync(outPath, payload, "utf8");
    return;
  }

  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n", "utf8");
}
