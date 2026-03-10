#!/usr/bin/env node
/**
 * Shared build utilities for native binary compilation scripts.
 * Eliminates duplication across build-globe-listener, build-macos-fast-paste,
 * build-macos-text-monitor, build-media-remote, and similar scripts.
 */

const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const BIN_DIR = path.join(PROJECT_ROOT, "resources", "bin");

// Mach-O CPU type constants for architecture verification
const ARCH_CPU_TYPE = {
  arm64: 0x0100000c, // CPU_TYPE_ARM64
  x64: 0x01000007, // CPU_TYPE_X86_64
};

const ARCH_TO_SWIFT_TARGET = {
  arm64: "arm64-apple-macosx11.0",
  x64: "x86_64-apple-macosx10.15",
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function makeLogger(name) {
  return (message) => console.log(`[${name}] ${message}`);
}

/**
 * Verify a Mach-O binary matches the expected CPU architecture.
 */
function verifyBinaryArch(binaryPath, expectedArch) {
  try {
    const fd = fs.openSync(binaryPath, "r");
    const header = Buffer.alloc(8);
    fs.readSync(fd, header, 0, 8, 0);
    fs.closeSync(fd);

    const magic = header.readUInt32LE(0);
    if (magic !== 0xfeedfacf) return false; // Not a 64-bit Mach-O
    const cpuType = header.readInt32LE(4);
    return cpuType === ARCH_CPU_TYPE[expectedArch];
  } catch {
    return false;
  }
}

/**
 * Check if a source file has changed since the last build using mtime + hash.
 */
function needsRebuild(sourcePath, binaryPath, hashFile, log, extraCheck) {
  if (!fs.existsSync(binaryPath)) return true;

  // Optional arch/custom check (e.g. verifyBinaryArch)
  if (extraCheck && !extraCheck()) {
    log("Extra check failed, rebuild needed");
    return true;
  }

  // mtime check
  try {
    const binaryStat = fs.statSync(binaryPath);
    const sourceStat = fs.statSync(sourcePath);
    if (binaryStat.mtimeMs < sourceStat.mtimeMs) return true;
  } catch {
    return true;
  }

  // Hash check
  try {
    const sourceContent = fs.readFileSync(sourcePath, "utf8");
    const currentHash = crypto.createHash("sha256").update(sourceContent).digest("hex");

    if (fs.existsSync(hashFile)) {
      const savedHash = fs.readFileSync(hashFile, "utf8").trim();
      if (savedHash !== currentHash) {
        log("Source hash changed, rebuild needed");
        return true;
      }
    } else {
      log("No hash file found, rebuild needed");
      return true;
    }
  } catch (err) {
    log(`Hash check failed: ${err.message}, forcing rebuild`);
    return true;
  }

  return false;
}

/**
 * Save source hash after a successful build.
 */
function saveHash(sourcePath, hashFile, log) {
  try {
    const sourceContent = fs.readFileSync(sourcePath, "utf8");
    const hash = crypto.createHash("sha256").update(sourceContent).digest("hex");
    fs.writeFileSync(hashFile, hash);
  } catch (err) {
    log(`Warning: Could not save source hash: ${err.message}`);
  }
}

/**
 * Set executable permissions on a binary.
 */
function makeExecutable(binaryPath, log) {
  try {
    fs.chmodSync(binaryPath, 0o755);
  } catch (error) {
    log(`Warning: Unable to set executable permissions: ${error.message}`);
  }
}

/**
 * Get the target architecture from --arch flag or TARGET_ARCH env var.
 */
function getTargetArch() {
  const archIndex = process.argv.indexOf("--arch");
  return (archIndex !== -1 && process.argv[archIndex + 1]) || process.env.TARGET_ARCH || process.arch;
}

/**
 * Build a macOS Swift binary.
 *
 * @param {object} config
 * @param {string} config.name - Display name for logging (e.g. "globe-listener")
 * @param {string} config.sourceFile - Swift source filename in resources/ (e.g. "macos-globe-listener.swift")
 * @param {string} config.outputName - Output binary name (e.g. "macos-globe-listener")
 */
function buildSwiftBinary({ name, sourceFile, outputName }) {
  if (process.platform !== "darwin") process.exit(0);

  const log = makeLogger(name);
  const targetArch = getTargetArch();
  const swiftTarget = ARCH_TO_SWIFT_TARGET[targetArch];

  if (!swiftTarget) {
    console.error(`[${name}] Unsupported architecture: ${targetArch}`);
    process.exit(1);
  }

  const swiftSource = path.join(PROJECT_ROOT, "resources", sourceFile);
  const outputBinary = path.join(BIN_DIR, outputName);
  const hashFile = path.join(BIN_DIR, `.${outputName}.${targetArch}.hash`);
  const moduleCacheDir = path.join(BIN_DIR, ".swift-module-cache");

  if (!fs.existsSync(swiftSource)) {
    console.error(`[${name}] Swift source not found at ${swiftSource}`);
    process.exit(1);
  }

  ensureDir(BIN_DIR);
  ensureDir(moduleCacheDir);

  const archCheck = () => verifyBinaryArch(outputBinary, targetArch);
  if (!needsRebuild(swiftSource, outputBinary, hashFile, log, archCheck)) {
    process.exit(0);
  }

  // Compile
  function attemptCompile(command, args) {
    log(`Compiling with ${[command, ...args].join(" ")}`);
    return spawnSync(command, args, {
      stdio: "inherit",
      env: { ...process.env, SWIFT_MODULE_CACHE_PATH: moduleCacheDir },
    });
  }

  const compileArgs = [
    swiftSource, "-O",
    "-target", swiftTarget,
    "-module-cache-path", moduleCacheDir,
    "-o", outputBinary,
  ];

  let result = attemptCompile("xcrun", ["swiftc", ...compileArgs]);
  if (result.status !== 0) {
    result = attemptCompile("swiftc", compileArgs);
  }
  if (result.status !== 0) {
    console.error(`[${name}] Failed to compile ${outputName} binary.`);
    process.exit(result.status ?? 1);
  }

  makeExecutable(outputBinary, log);

  // Verify architecture
  if (!verifyBinaryArch(outputBinary, targetArch)) {
    console.error(
      `[${name}] FATAL: Compiled binary architecture does not match target (${targetArch}). ` +
      `This can happen when cross-compiling without setting TARGET_ARCH env var.`
    );
    process.exit(1);
  }

  saveHash(swiftSource, hashFile, log);
  log(`Successfully built ${outputName} binary (${targetArch}).`);
}

module.exports = {
  PROJECT_ROOT,
  BIN_DIR,
  ensureDir,
  makeLogger,
  verifyBinaryArch,
  needsRebuild,
  saveHash,
  makeExecutable,
  getTargetArch,
  buildSwiftBinary,
};
