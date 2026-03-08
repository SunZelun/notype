# NOTYPE Prompt Optimization

This repo now includes a local prompt-evaluation loop built around your Typeless history DB and recordings.

## Goal

Use real Typeless outputs as teacher data to rank candidate NOTYPE cleanup prompts before changing the runtime prompt again.

## Runtime Prompt

The NOTYPE cleanup path now uses a structured prompt policy assembled from:

- base cleanup contract
- cleanup rules
- preservation rules
- formatting rules
- context packs
- language guidance
- custom dictionary guidance

Relevant files:

- [src/domain/promptPolicy.mjs](/Users/sunzelun/Desktop/projects/notype/src/domain/promptPolicy.mjs)
- [src/domain/promptBuilder.js](/Users/sunzelun/Desktop/projects/notype/src/domain/promptBuilder.js)
- [src/domain/cerebrasCleanupAdapter.js](/Users/sunzelun/Desktop/projects/notype/src/domain/cerebrasCleanupAdapter.js)

## Extract a Dataset From Typeless

```bash
npm run prompt:extract-typeless
```

Optional flags:

```bash
node scripts/extract-typeless-dataset.mjs --limit 25 --out tmp/prompt-eval/typeless-dataset.jsonl
```

The extracted dataset includes:

- reference text from Typeless `refined_text`
- local audio path
- language
- app/window context
- derived NOTYPE context class

## Run the Prompt Benchmark

Dry run:

```bash
npm run prompt:benchmark -- --dry-run --limit 10
```

Full benchmark:

```bash
npm run prompt:benchmark -- --limit 10
```

Optional flags:

```bash
node scripts/run-prompt-benchmark.mjs \
  --dataset tmp/prompt-eval/typeless-dataset.json \
  --candidates baseline-minimal,notype-policy-v1,notype-policy-v1-strict \
  --out-dir tmp/prompt-eval/latest
```

## Environment Requirements

The full benchmark needs:

- `GROQ_API_KEY`
- `CUSTOM_REASONING_API_KEY` or `CEREBRAS_API_KEY`

The benchmark uses Groq to recreate raw transcripts from Typeless recordings, then runs each prompt candidate through Cerebras and scores the output against Typeless `refined_text`.

## Outputs

Benchmark outputs go to `tmp/prompt-eval/latest` by default:

- `summary.json`
- `summary.md`
- `results.json`
- `dataset.snapshot.json`

Transcript caching is stored at:

- `tmp/prompt-eval/transcript-cache.json`

## Current Candidate Set

- `baseline-minimal`
- `notype-policy-v1`
- `notype-policy-v1-no-context`
- `notype-policy-v1-strict`
- `notype-policy-v2-fidelity`

The default runtime prompt candidate is `notype-policy-v2-fidelity`.
