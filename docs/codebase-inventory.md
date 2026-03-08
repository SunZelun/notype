# NOTYPE Codebase Inventory

## Keep

- Electron shell and tray/bootstrap flow in `main.js`
- macOS `Fn` / `Globe` listener in `resources/macos-globe-listener.swift`
- macOS fast-paste binary in `resources/macos-fast-paste.swift`
- Recording loop in `src/hooks/useAudioRecording.js`
- Clipboard/paste service in `src/helpers/clipboard.js`
- Local transcription history in `src/helpers/database.js`

## Simplify

- `src/helpers/audioManager.js`
  Replace provider sprawl with the Groq -> Cerebras path.
- `src/stores/settingsStore.ts`
  Default to Groq STT and Cerebras cleanup.
- `src/helpers/ipcHandlers.js`
  Retain the dictation, clipboard, env, and history handlers.

## Remove Or Decommission

- OpenWhispr auth and onboarding flows
- Billing, referrals, and notes surfaces
- Local model download/management flows
- Streaming transcription provider branches not used by NOTYPE
- Post-paste text monitoring and correction learning
