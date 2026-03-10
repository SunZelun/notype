#!/usr/bin/env node
const { buildSwiftBinary } = require("./lib/build-utils");

buildSwiftBinary({
  name: "media-remote",
  sourceFile: "macos-media-remote.swift",
  outputName: "macos-media-remote",
});
