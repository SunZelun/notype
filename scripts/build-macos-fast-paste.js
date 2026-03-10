#!/usr/bin/env node
const { buildSwiftBinary } = require("./lib/build-utils");

buildSwiftBinary({
  name: "fast-paste",
  sourceFile: "macos-fast-paste.swift",
  outputName: "macos-fast-paste",
});
