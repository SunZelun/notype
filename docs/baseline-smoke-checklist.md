# NOTYPE Baseline Smoke Checklist

## App launch

- App launches without crashing.
- Floating dictation panel appears.
- Tray/menu bar item appears.

## Hotkey

- Default hotkey resolves to `Fn` / `Globe` on macOS.
- Pressing the hotkey starts recording once.
- Pressing the hotkey again stops recording once.
- Repeated taps do not create duplicate sessions.

## Recording and clipboard

- Microphone permission prompt appears when needed.
- Recording state is visually obvious.
- Processing state is visually obvious after stop.
- Successful dictation copies final text to the clipboard.
- Successful dictation attempts auto-paste.

## Failure handling

- Missing accessibility permission leaves output on the clipboard.
- Cleanup failure copies the raw transcript to the clipboard.
- Cleanup failure does not auto-paste the raw transcript.
