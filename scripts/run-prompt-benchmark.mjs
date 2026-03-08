import path from "path";
import dotenv from "dotenv";
import { runPromptBenchmark } from "./lib/promptEval.mjs";
import {
  extractTypelessDataset,
  getDefaultTypelessPaths,
  loadDatasetFile,
  writeDatasetFile,
} from "./lib/typelessDataset.mjs";

dotenv.config({ path: path.join(process.cwd(), ".env") });

function parseArgs(argv) {
  const args = {
    outDir: path.join("tmp", "prompt-eval", "latest"),
    transcriptCache: path.join("tmp", "prompt-eval", "transcript-cache.json"),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--dataset" && next) {
      args.dataset = next;
      i++;
    } else if (arg === "--db" && next) {
      args.db = next;
      i++;
    } else if (arg === "--out-dir" && next) {
      args.outDir = next;
      i++;
    } else if (arg === "--transcript-cache" && next) {
      args.transcriptCache = next;
      i++;
    } else if (arg === "--limit" && next) {
      args.limit = Number.parseInt(next, 10);
      i++;
    } else if (arg === "--candidates" && next) {
      args.candidates = next.split(",").map((value) => value.trim()).filter(Boolean);
      i++;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--groq-model" && next) {
      args.groqModel = next;
      i++;
    } else if (arg === "--cleanup-model" && next) {
      args.cleanupModel = next;
      i++;
    } else if (arg === "--help") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/run-prompt-benchmark.mjs [options]

Options:
  --dataset <path>         Use a pre-extracted dataset file (.json or .jsonl)
  --db <path>              Extract directly from a Typeless history DB
  --out-dir <path>         Output directory for reports
  --transcript-cache <p>   JSON cache for Groq raw transcripts
  --limit <n>              Limit sample count
  --candidates <ids>       Comma-separated prompt candidate IDs
  --groq-model <id>        Override the Groq STT model
  --cleanup-model <id>     Override the Cerebras cleanup model
  --dry-run                Build prompts and reports without calling Groq/Cerebras
  --help                   Show this help text
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const defaults = getDefaultTypelessPaths();
  let dataset;

  if (args.dataset) {
    dataset = loadDatasetFile(args.dataset);
  } else {
    dataset = extractTypelessDataset({
      dbPath: args.db || defaults.dbPath,
      recordingsDir: defaults.recordingsDir,
      limit: args.limit,
    });
    writeDatasetFile(dataset, path.join(args.outDir, "dataset.snapshot.json"));
  }

  if (args.limit && dataset.length > args.limit) {
    dataset = dataset.slice(0, args.limit);
  }

  const { summary } = await runPromptBenchmark({
    dataset,
    candidateIds: args.candidates,
    dryRun: Boolean(args.dryRun),
    outDir: args.outDir,
    transcriptCachePath: args.transcriptCache,
    groqModel: args.groqModel,
    cleanupModel: args.cleanupModel,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
