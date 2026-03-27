import path from "node:path";
import { buildFrameworkSite } from "../../server/build";
import { loadUserConfig } from "../../server/server";

export async function runBuild(options: {
  cwd?: string;
  positional?: string[];
  log?: (message: string) => void;
} = {}): Promise<void> {
  if ((options.positional ?? []).length > 0) {
    throw new Error("build does not accept positional arguments");
  }

  const rootDir = path.resolve(options.cwd ?? process.cwd());
  const config = await loadUserConfig(rootDir);
  const output = await buildFrameworkSite({ rootDir, config });
  const log = options.log ?? console.log;

  log(`MDSN build complete: ${output.outDir}`);
}
