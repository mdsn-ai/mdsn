import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { actionFilePathToActionId } from "./action";
import { resolveConfig, type MdsnConfig } from "./config";
import { parsePageDefinition } from "../core/document/page-definition";
import { pagePathToRoutePath } from "./routes";
import { findActionFiles, findPageFiles, resolveSitePaths } from "./site";

export type BuildOutput = {
  outDir: string;
  pagesManifestPath: string;
  actionsManifestPath: string;
};

type ActionManifestEntry = {
  id: string;
  file: string;
  exportName?: string;
};

function copyDirectoryContents(sourceDir: string, destinationDir: string): void {
  const entries = readdirSync(sourceDir, { withFileTypes: true });

  mkdirSync(destinationDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      mkdirSync(path.dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

export async function buildFrameworkSite(options: {
  rootDir: string;
  config?: MdsnConfig;
}): Promise<BuildOutput> {
  const resolvedConfig = resolveConfig(options.config ?? {});
  const site = resolveSitePaths(options.rootDir, options.config ?? {});
  const outDir = path.join(options.rootDir, "dist");
  const manifestDir = path.join(outDir, "manifest");
  const pagesOutDir = path.join(outDir, resolvedConfig.dirs.pages);
  const serverOutDir = path.join(outDir, resolvedConfig.dirs.server);
  const publicOutDir = path.join(outDir, resolvedConfig.dirs.public);
  const layoutsOutDir = path.join(outDir, resolvedConfig.dirs.layouts);
  const pageFiles = findPageFiles(site.pagesDir);
  const actionFiles = findActionFiles(site.serverDir);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(manifestDir, { recursive: true });

  const actionFilesById = new Map(
    actionFiles.map((filePath) => {
      const relativeToServerDir = path.relative(site.serverDir, filePath).split(path.sep).join("/");
      return [actionFilePathToActionId(relativeToServerDir, ""), relativeToServerDir] as const;
    }),
  );

  const pagesManifest = pageFiles.map((filePath) => {
    const relativeToPagesDir = path.relative(site.pagesDir, filePath).split(path.sep).join("/");
    return {
      file: relativeToPagesDir,
      routePath: pagePathToRoutePath(
        `${resolvedConfig.dirs.pages}/${relativeToPagesDir}`,
        resolvedConfig.dirs.pages,
      ),
    };
  }).sort((left, right) => left.routePath.localeCompare(right.routePath));

  const actionsManifest = new Map<string, ActionManifestEntry>();

  function normalizeDeclaredActionId(target: string): string | null {
    const trimmed = String(target).trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.toLowerCase().endsWith(".md")) {
      return null;
    }
    return trimmed.replace(/^\/+/u, "");
  }

  function addManifestEntry(entry: ActionManifestEntry) {
    actionsManifest.set(entry.id, entry);
  }

  function resolveActionsFileEntry(actionId: string): ActionManifestEntry | null {
    const directFile = actionFilesById.get(actionId);
    if (directFile) {
      return { id: actionId, file: directFile };
    }

    const segments = actionId.split("/").filter(Boolean);
    const exportName = segments.pop();
    if (!exportName) {
      return null;
    }

    const actionsFileId = segments.length > 0 ? `${segments.join("/")}/actions` : "actions";
    const actionsFile = actionFilesById.get(actionsFileId);
    if (!actionsFile) {
      return null;
    }

    return {
      id: actionId,
      file: actionsFile,
      exportName,
    };
  }

  for (const filePath of pageFiles) {
    const pageSource = readFileSync(filePath, "utf8");
    let page;
    try {
      page = parsePageDefinition(pageSource);
    } catch {
      continue;
    }

    for (const block of page.blocks) {
      for (const operation of [...block.reads, ...block.writes]) {
        const actionId = normalizeDeclaredActionId(operation.target);
        if (!actionId) {
          continue;
        }

        const entry = resolveActionsFileEntry(actionId);
        if (entry) {
          addManifestEntry(entry);
        }
      }
    }
  }

  for (const [actionId, relativeToServerDir] of actionFilesById.entries()) {
    if (actionId === "actions" || actionId.endsWith("/actions")) {
      continue;
    }
    if (!actionsManifest.has(actionId)) {
      addManifestEntry({ id: actionId, file: relativeToServerDir });
    }
  }

  const pagesManifestPath = path.join(manifestDir, "pages.json");
  const actionsManifestPath = path.join(manifestDir, "actions.json");

  writeFileSync(pagesManifestPath, JSON.stringify(pagesManifest, null, 2) + "\n", "utf8");
  writeFileSync(
    actionsManifestPath,
    JSON.stringify(Array.from(actionsManifest.values()).sort((left, right) => left.id.localeCompare(right.id)), null, 2) + "\n",
    "utf8",
  );
  writeFileSync(path.join(outDir, "mdsn.config.json"), JSON.stringify(resolvedConfig, null, 2) + "\n", "utf8");

  try {
    if (statSync(site.pagesDir).isDirectory()) {
      copyDirectoryContents(site.pagesDir, pagesOutDir);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    if (statSync(site.serverDir).isDirectory()) {
      copyDirectoryContents(site.serverDir, serverOutDir);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    if (statSync(site.publicDir).isDirectory()) {
      copyDirectoryContents(site.publicDir, publicOutDir);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  try {
    if (statSync(site.layoutsDir).isDirectory()) {
      copyDirectoryContents(site.layoutsDir, layoutsOutDir);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return {
    outDir,
    pagesManifestPath,
    actionsManifestPath,
  };
}
