#!/usr/bin/env node

const { runCli } = require("@mdsnai/sdk/cli");

runCli(["create", ...process.argv.slice(2)]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
