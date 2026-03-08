# NOTYPE

Minimal desktop dictation focused on a single fast path:

- `Fn`/configured hotkey to start and stop recording
- Groq `whisper-large-v3-turbo` for transcription
- Cerebras `gpt-oss-120b` for cleanup
- Clipboard-first output with local SQLite history

## Repo Shape

- `src/App.jsx`: floating dictation bubble
- `src/components/NotypeSettingsWindow.tsx`: settings and history window
- `src/domain/`: NOTYPE-specific coordination and provider adapters
- `docs/`: PRD, implementation plan, and baseline artifacts

## Prompt Optimization

NOTYPE includes a local prompt benchmark flow built around Typeless recordings and history data.

```bash
npm run prompt:extract-typeless
npm run prompt:benchmark -- --dry-run --limit 10
```

See [docs/prompt-optimization.md](/Users/sunzelun/Desktop/projects/notype/docs/prompt-optimization.md).

## Local Development

```bash
npm install
npm run compile:native
npm run dev
```

## Validation

```bash
npm test
npm run typecheck
npm run build:renderer
```
