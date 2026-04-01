import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type StarterRuntime = "node" | "bun";

export interface ScaffoldStarterProjectOptions {
  targetDir: string;
  projectName?: string;
  sdkVersion: string;
  runtime?: StarterRuntime;
}

const TEMPLATE_PLACEHOLDERS = {
  __PROJECT_NAME__: "",
  __SDK_VERSION__: ""
} as const;

const DEFAULT_RUNTIME: StarterRuntime = "node";

export function toCompatibleSdkRange(packageVersion: string): string {
  const match = packageVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    throw new Error(`Unsupported package version "${packageVersion}".`);
  }

  const [, major, minor] = match;
  return `^${major}.${minor}.0`;
}

function templateRootsFromModule(moduleUrl: string, runtime: StarterRuntime): string[] {
  return [
    resolve(fileURLToPath(new URL("../template/shared", moduleUrl))),
    resolve(fileURLToPath(new URL(`../template/${runtime}`, moduleUrl)))
  ];
}

async function ensureEmptyTarget(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new Error(`Target path "${targetDir}" already exists and is not a directory.`);
    }
    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory "${targetDir}" must be empty.`);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      await mkdir(targetDir, { recursive: true });
      return;
    }
    throw error;
  }
}

async function replaceInFile(filePath: string, replacements: Record<string, string>): Promise<void> {
  const original = await readFile(filePath, "utf8");
  let next = original;
  for (const [pattern, value] of Object.entries(replacements)) {
    next = next.replaceAll(pattern, value);
  }
  if (next !== original) {
    await writeFile(filePath, next, "utf8");
  }
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(filePath)));
      continue;
    }
    files.push(filePath);
  }
  return files;
}

export async function scaffoldStarterProject(
  options: ScaffoldStarterProjectOptions,
  moduleUrl = import.meta.url
): Promise<string> {
  const runtime = options.runtime ?? DEFAULT_RUNTIME;
  const templateRoots = templateRootsFromModule(moduleUrl, runtime);
  const targetDir = resolve(options.targetDir);
  const projectName = options.projectName?.trim() || basename(targetDir);

  if (!projectName) {
    throw new Error("Project name cannot be empty.");
  }

  await ensureEmptyTarget(targetDir);
  for (const templateRoot of templateRoots) {
    await cp(templateRoot, targetDir, { recursive: true });
  }

  const replacements = {
    __PROJECT_NAME__: projectName,
    __SDK_VERSION__: options.sdkVersion
  };

  const files = await walkFiles(targetDir);
  await Promise.all(files.map((filePath) => replaceInFile(filePath, replacements)));
  return targetDir;
}
