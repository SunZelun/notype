# NOTYPE

Minimal macOS-first desktop dictation.

Press a hotkey, speak, clean, paste.

Suggested GitHub repository description:
`Minimal macOS-first desktop dictation app built on Electron with Groq transcription, Cerebras cleanup, and a clipboard-first workflow.`

## Overview

NOTYPE is a focused desktop dictation utility designed around a single fast path:

1. Press a global hotkey.
2. Record speech immediately.
3. Stop recording with the same hotkey.
4. Transcribe with Groq `whisper-large-v3-turbo`.
5. Clean the transcript with Cerebras `gpt-oss-120b`.
6. Copy the final text to the clipboard first.
7. Attempt auto-paste when the OS allows it.

The product is intentionally narrow:

- keyboard-first
- low-friction
- clipboard-first for safety
- minimal UI
- local history
- no account system in the main NOTYPE workflow

## Status

NOTYPE is an active open-source extraction and simplification of the upstream OpenWhispr codebase. The project is being reshaped into a standalone dictation app with a smaller product surface, cleaner branding, and a more focused architecture.

Current priority:

- polish the core dictation loop
- simplify the codebase
- improve prompt quality and transcription cleanup
- finish the open-source rebrand and packaging surface

## Features

- Global hotkey to start and stop dictation
- macOS-first floating dictation bubble
- Groq `whisper-large-v3-turbo` for speech-to-text
- Cerebras `gpt-oss-120b` for cleanup
- Clipboard-first output with auto-paste fallback
- Local history stored on-device
- Minimal settings and history window
- Prompt benchmarking workflow using local Typeless data

## Based On OpenWhispr

NOTYPE is based on the technical foundation of [OpenWhispr](https://github.com/OpenWhispr/openwhispr).

OpenWhispr provided a strong starting point for:

- the Electron shell
- global hotkeys
- native macOS helpers
- microphone capture
- clipboard and paste plumbing

NOTYPE is not intended to remain a feature superset of OpenWhispr. The direction of this repository is to keep the useful desktop plumbing while removing unrelated product surfaces and turning the project into a clean, focused open-source dictation tool.

## Quick Start

### Requirements

- Node.js 20+
- npm
- macOS is the primary target

### Environment

Copy the example environment file and provide your API keys:

```bash
cp .env.example .env
```

At minimum, configure:

- `GROQ_API_KEY`
- `CUSTOM_REASONING_API_KEY` or `CEREBRAS_API_KEY`

### Run Locally

```bash
npm install
npm run compile:native
npm run dev
```

### Validate

```bash
npm test
npm run typecheck
npm run build:renderer
```

## Prompt Optimization

NOTYPE includes a local prompt evaluation workflow that can benchmark candidate cleanup prompts against your local Typeless recordings and history data.

Extract a benchmark dataset:

```bash
npm run prompt:extract-typeless
```

Run a dry run:

```bash
npm run prompt:benchmark -- --dry-run --limit 10
```

Run a live benchmark:

```bash
npm run prompt:benchmark -- --limit 10
```

See [docs/prompt-optimization.md](/Users/sunzelun/Desktop/projects/notype/docs/prompt-optimization.md) for details.

## Repository Layout

- `src/App.jsx`: floating dictation bubble
- `src/components/NotypeSettingsWindow.tsx`: settings and history UI
- `src/domain/`: NOTYPE-specific prompt, provider, and dictation domain logic
- `src/helpers/`: Electron-side system and native integration helpers
- `scripts/`: build helpers, native binary scripts, and prompt-eval tooling
- `tests/`: unit tests
- `docs/`: product docs, planning notes, and prompt optimization docs

## Roadmap

- Continue removing legacy OpenWhispr-specific product surfaces
- Finish rebranding remaining user-facing strings and assets
- Improve dictation UX and visual feedback
- Strengthen prompt evaluation and data-driven cleanup tuning
- Prepare polished public release artifacts for macOS

## Contributing

Issues and pull requests are welcome.

Good contribution areas:

- macOS dictation UX
- prompt quality and evaluation
- accessibility and permissions UX
- branding and icon work
- codebase simplification and dead-surface removal

Before opening a PR, please run:

```bash
npm test
npm run typecheck
npm run build:renderer
```

## License

MIT. See [LICENSE](/Users/sunzelun/Desktop/projects/notype/LICENSE).

## Acknowledgments

- [OpenWhispr](https://github.com/OpenWhispr/openwhispr) for the upstream desktop foundation
- Groq for fast cloud transcription
- Cerebras for transcript cleanup
