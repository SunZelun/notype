#!/usr/bin/env node

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { BIN_DIR, PROJECT_ROOT, ensureDir, makeLogger, makeExecutable } = require("./lib/build-utils");

if (process.platform !== "linux") process.exit(0);

const log = makeLogger("linux-fast-paste");

const cSource = path.join(PROJECT_ROOT, "resources", "linux-fast-paste.c");
const outputBinary = path.join(BIN_DIR, "linux-fast-paste");
const hashFile = path.join(BIN_DIR, ".linux-fast-paste.hash");

if (!fs.existsSync(cSource)) {
  console.error(`[linux-fast-paste] C source not found at ${cSource}`);
  process.exit(1);
}

ensureDir(BIN_DIR);

// Check if binary is up-to-date (mtime)
let needsBuild = true;
if (fs.existsSync(outputBinary)) {
  try {
    const binaryStat = fs.statSync(outputBinary);
    const sourceStat = fs.statSync(cSource);
    if (binaryStat.mtimeMs >= sourceStat.mtimeMs) needsBuild = false;
  } catch {
    needsBuild = true;
  }
}

function hasUinputHeaders() {
  for (const compiler of ["gcc", "cc"]) {
    try {
      const result = spawnSync(compiler, ["-E", "-x", "c", "-"], {
        input: "#include <linux/uinput.h>\n",
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });
      if (result.status === 0) return true;
    } catch {}
  }
  return false;
}

function hasGio() {
  try {
    return spawnSync("pkg-config", ["--exists", "gio-2.0"], { stdio: "pipe" }).status === 0;
  } catch {}
  return false;
}

function getGioFlags() {
  try {
    const cflags = spawnSync("pkg-config", ["--cflags", "gio-2.0"], { stdio: "pipe" });
    const libs = spawnSync("pkg-config", ["--libs", "gio-2.0"], { stdio: "pipe" });
    if (cflags.status === 0 && libs.status === 0) {
      return [
        ...cflags.stdout.toString().trim().split(/\s+/),
        ...libs.stdout.toString().trim().split(/\s+/),
      ].filter(Boolean);
    }
  } catch {}
  return [];
}

const uinputAvailable = hasUinputHeaders();
const gioAvailable = hasGio();

function computeBuildHash() {
  const sourceContent = fs.readFileSync(cSource, "utf8");
  const flags = [
    uinputAvailable ? "uinput" : "nouinput",
    gioAvailable ? "gio" : "nogio",
  ].join("+");
  return crypto.createHash("sha256").update(sourceContent + flags).digest("hex");
}

// Hash check (includes build flags, not just source)
if (!needsBuild && fs.existsSync(outputBinary)) {
  try {
    const currentHash = computeBuildHash();
    if (fs.existsSync(hashFile)) {
      const savedHash = fs.readFileSync(hashFile, "utf8").trim();
      if (savedHash !== currentHash) {
        log("Source or build flags changed, rebuild needed");
        needsBuild = true;
      }
    } else {
      fs.writeFileSync(hashFile, currentHash);
    }
  } catch (err) {
    log(`Hash check failed: ${err.message}, forcing rebuild`);
    needsBuild = true;
  }
}

if (!needsBuild) process.exit(0);

const compileArgs = ["-O2", cSource, "-o", outputBinary, "-lX11", "-lXtst"];

if (uinputAvailable) {
  log("uinput headers found, enabling uinput support");
  compileArgs.push("-DHAVE_UINPUT");
} else {
  log("uinput headers not found, building without uinput support");
}

if (gioAvailable) {
  log("gio-2.0 found, enabling portal support");
  compileArgs.push("-DHAVE_GIO", ...getGioFlags());
} else {
  log("gio-2.0 not found, building without portal support");
}

let result = spawnSync("gcc", compileArgs, { stdio: "inherit", env: process.env });
if (result.status !== 0) {
  result = spawnSync("cc", compileArgs, { stdio: "inherit", env: process.env });
}

if (result.status !== 0) {
  console.warn(
    "[linux-fast-paste] Failed to compile. Install libx11-dev and libxtst-dev to enable native paste."
  );
  process.exit(0);
}

makeExecutable(outputBinary, log);

try {
  fs.writeFileSync(hashFile, computeBuildHash());
} catch (err) {
  log(`Warning: Could not save source hash: ${err.message}`);
}

log("Successfully built Linux fast-paste binary.");
