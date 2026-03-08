import path from "path";
import { extractTypelessDataset, getDefaultTypelessPaths, writeDatasetFile } from "./lib/typelessDataset.mjs";

function parseArgs(argv) {
  const args = {
    out: path.join("tmp", "prompt-eval", "typeless-dataset.json"),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--db" && next) {
      args.db = next;
      i++;
    } else if (arg === "--out" && next) {
      args.out = next;
      i++;
    } else if (arg === "--limit" && next) {
      args.limit = Number.parseInt(next, 10);
      i++;
    } else if (arg === "--help") {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/extract-typeless-dataset.mjs [options]

Options:
  --db <path>      Override Typeless history DB path
  --out <path>     Output path (.json or .jsonl)
  --limit <n>      Limit the number of extracted rows
  --help           Show this help text
`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const defaults = getDefaultTypelessPaths();
const dataset = extractTypelessDataset({
  dbPath: args.db || defaults.dbPath,
  recordingsDir: defaults.recordingsDir,
  limit: args.limit,
});

writeDatasetFile(dataset, args.out);

console.log(
  JSON.stringify(
    {
      extracted: dataset.length,
      withAudio: dataset.filter((item) => item.audioExists).length,
      out: args.out,
    },
    null,
    2
  )
);
