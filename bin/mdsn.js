#!/usr/bin/env node

require("tsx/cjs");
const { runCli } = require("../sdk/src/cli/index.ts");

runCli(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
