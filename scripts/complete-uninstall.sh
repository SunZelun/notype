#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "This script will stop NOTYPE, remove the installed app, and delete caches, databases, and preferences."
read -r -p "Continue with the full uninstall? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

remove_target() {
  local target="$1"
  if [[ -e "$target" ]]; then
    echo "Removing $target"
    rm -rf "$target" 2>/dev/null || sudo rm -rf "$target"
  fi
}

echo "Stopping running NOTYPE/Electron processes..."
pkill -f "NOTYPE" 2>/dev/null || true
pkill -f "com.notype.app" 2>/dev/null || true
pkill -f "Electron Helper.*NOTYPE" 2>/dev/null || true
pkill -f "OpenWhispr" 2>/dev/null || true
pkill -f "open-whispr" 2>/dev/null || true

echo "Removing /Applications/NOTYPE.app (requires admin)..."
remove_target "/Applications/NOTYPE.app"

echo "Purging Application Support data..."
remove_target "$HOME/Library/Application Support/NOTYPE"
remove_target "$HOME/Library/Application Support/NOTYPE-development"
remove_target "$HOME/Library/Application Support/com.notype.app"
remove_target "$HOME/Library/Application Support/OpenWhispr"
remove_target "$HOME/Library/Application Support/open-whispr"
remove_target "$HOME/Library/Application Support/OpenWhispr-dev"
remove_target "$HOME/Library/Application Support/com.openwhispr"
remove_target "$HOME/Library/Application Support/com.openwhispr.OpenWhispr"

echo "Removing caches, logs, and saved state..."
remove_target "$HOME/Library/Caches/NOTYPE"
remove_target "$HOME/Library/Preferences/com.notype.app.plist"
remove_target "$HOME/Library/Logs/NOTYPE"
remove_target "$HOME/Library/Saved Application State/com.notype.app.savedState"
remove_target "$HOME/Library/Caches/open-whispr"
remove_target "$HOME/Library/Caches/com.openwhispr.OpenWhispr"
remove_target "$HOME/Library/Preferences/com.openwhispr.OpenWhispr.plist"
remove_target "$HOME/Library/Preferences/com.openwhispr.helper.plist"
remove_target "$HOME/Library/Logs/OpenWhispr"
remove_target "$HOME/Library/Saved Application State/com.openwhispr.OpenWhispr.savedState"

echo "Cleaning temporary files..."
shopt -s nullglob
for tmp in /tmp/notype*; do
  remove_target "$tmp"
done
for tmp in /tmp/openwhispr*; do
  remove_target "$tmp"
done
for crash in "$HOME/Library/Application Support/CrashReporter"/NOTYPE_*; do
  remove_target "$crash"
done
for crash in "$HOME/Library/Application Support/CrashReporter"/OpenWhispr_*; do
  remove_target "$crash"
done
shopt -u nullglob

read -r -p "Remove downloaded Whisper models and caches (~/.cache/whisper, ~/Library/Application Support/whisper)? [y/N]: " wipe_models
if [[ "$wipe_models" =~ ^[Yy]$ ]]; then
  remove_target "$HOME/.cache/whisper"
  remove_target "$HOME/Library/Application Support/whisper"
  remove_target "$HOME/Library/Application Support/NOTYPE/models"
  remove_target "$HOME/Library/Application Support/OpenWhispr/models"
fi

ENV_FILE="$PROJECT_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  read -r -p "Remove the local environment file at $ENV_FILE? [y/N]: " wipe_env
  if [[ "$wipe_env" =~ ^[Yy]$ ]]; then
    echo "Removing $ENV_FILE"
    rm -f "$ENV_FILE"
  fi
fi

cat <<'EOF'
macOS keeps microphone, screen recording, and accessibility approvals even after files are removed.
Reset them if you want a truly fresh start:
  tccutil reset Microphone com.notype.app
  tccutil reset Accessibility com.notype.app
  tccutil reset ScreenCapture com.notype.app

Full uninstall complete. Reboot if you removed permissions, then reinstall or run npm scripts on a clean tree.
EOF
