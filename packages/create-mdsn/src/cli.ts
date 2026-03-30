#!/usr/bin/env node

import { resolve } from "node:path";

import { readCreateMdsnVersion, scaffoldStarterProject } from "./index.js";

function printUsage(): void {
  console.log("Usage: npm create mdsn@latest <project-name>");
}

async function main(argv: string[]): Promise<void> {
  const [targetArg] = argv;

  if (!targetArg || targetArg === "--help" || targetArg === "-h") {
    printUsage();
    return;
  }

  const targetDir = resolve(process.cwd(), targetArg);
  const version = await readCreateMdsnVersion();
  const projectDir = await scaffoldStarterProject({
    targetDir,
    sdkVersion: version,
    ...(targetArg === "." ? {} : { projectName: targetArg })
  });

  console.log(`Created MDSN starter in ${projectDir}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${targetArg}`);
  console.log("  npm install");
  console.log("  npm run build");
  console.log("  npm start");
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
