import path from "node:path";
import { readdirSync } from "node:fs";
import { resolveConfig, type MdsnConfig } from "./config";

export type FrameworkSitePaths = {
  rootDir: string;
  pagesDir: string;
  serverDir: string;
  publicDir: string;
  layoutsDir: string;
};

export function resolveSitePaths(rootDir: string, config: MdsnConfig): FrameworkSitePaths {
  const resolved = resolveConfig(config);

  return {
    rootDir,
    pagesDir: path.join(rootDir, resolved.dirs.pages),
    serverDir: path.join(rootDir, resolved.dirs.server),
    publicDir: path.join(rootDir, resolved.dirs.public),
    layoutsDir: path.join(rootDir, resolved.dirs.layouts),
  };
}

function walkFiles(rootDir: string): string[] {
  try {
    const entries = readdirSync(rootDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const absolutePath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkFiles(absolutePath));
        continue;
      }
      if (entry.isFile()) {
        files.push(absolutePath);
      }
    }

    return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function hasIgnoredPrivateSegment(rootDir: string, filePath: string): boolean {
  const relativeSegments = path.relative(rootDir, filePath).split(path.sep).filter(Boolean);
  return relativeSegments.some((segment) => segment.startsWith("_") || segment === "lib");
}

export function findPageFiles(pagesDir: string): string[] {
  return walkFiles(pagesDir)
    .filter((filePath) => filePath.endsWith(".md"))
    .sort();
}

export function findActionFiles(serverDir: string): string[] {
  return walkFiles(serverDir)
    .filter((filePath) => /\.(js|mjs|cjs)$/.test(filePath))
    .filter((filePath) => !hasIgnoredPrivateSegment(serverDir, filePath))
    .sort();
}
