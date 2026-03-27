import path from "node:path";
import { spawnSync } from "node:child_process";
import { createStarterSite } from "../../server/init";
import type { ParsedCliArgs } from "../args";

function installStarterDependencies(targetDir: string): void {
  if (process.env.MDSN_CREATE_SKIP_INSTALL === "1") {
    return;
  }

  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(command, ["install"], {
    cwd: targetDir,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw new Error(`Failed to install starter dependencies: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`npm install failed in ${targetDir}`);
  }
}

export async function runCreate(options: ParsedCliArgs = { positional: [] }): Promise<void> {
  if (options.port !== undefined) {
    throw new Error("Option --port is only supported by dev/start");
  }

  if (options.positional.length > 1) {
    throw new Error("create accepts at most one target directory");
  }

  const cwd = path.resolve(options.cwd ?? process.cwd());
  const targetDir = options.positional[0] ?? ".";
  const absoluteTargetDir = path.resolve(cwd, targetDir);
  createStarterSite(absoluteTargetDir);
  installStarterDependencies(absoluteTargetDir);
}
