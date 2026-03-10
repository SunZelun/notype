#!/usr/bin/env node
const { buildSwiftBinary } = require("./lib/build-utils");

buildSwiftBinary({
  name: "text-monitor",
  sourceFile: "macos-text-monitor.swift",
  outputName: "macos-text-monitor",
});
