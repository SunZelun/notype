#!/usr/bin/env node
const { buildSwiftBinary } = require("./lib/build-utils");

buildSwiftBinary({
  name: "globe-listener",
  sourceFile: "macos-globe-listener.swift",
  outputName: "macos-globe-listener",
});
