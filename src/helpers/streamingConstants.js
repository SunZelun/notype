/**
 * Shared constants for real-time streaming transcription providers.
 * Used by deepgramStreaming.js and assemblyAiStreaming.js.
 */

const SAMPLE_RATE = 16000;
const WEBSOCKET_TIMEOUT_MS = 30000;
const TERMINATION_TIMEOUT_MS = 5000;
const TOKEN_REFRESH_BUFFER_MS = 30000;
const TOKEN_EXPIRY_MS = 300000;
const REWARM_DELAY_MS = 2000;
const MAX_REWARM_ATTEMPTS = 10;

module.exports = {
  SAMPLE_RATE,
  WEBSOCKET_TIMEOUT_MS,
  TERMINATION_TIMEOUT_MS,
  TOKEN_REFRESH_BUFFER_MS,
  TOKEN_EXPIRY_MS,
  REWARM_DELAY_MS,
  MAX_REWARM_ATTEMPTS,
};
