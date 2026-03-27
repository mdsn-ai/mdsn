import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHostedApp, type CreateHostedAppOptions } from "./hosted-app";
import { parseFrontmatter } from "../core/document/frontmatter";
import type { ActionHandler } from "../server/action-host";
import { resolveConfig, type MdsnConfig } from "../server/config";
import { importModuleFromFile } from "../server/module-loader";
import { findActionFiles } from "../server/site";
import { defaultLocaleRouteToFallbackPath, pagePathToRoutePath } from "../server/routes";

function walkMarkdownFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && absolutePath.endsWith(".md")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function actionFileToId(filePath: string, serverDir: string): string {
  return path.relative(serverDir, filePath).split(path.sep).join("/").replace(/\.[^.]+$/u, "");
}

function resolveActionLocation(
  actionId: string,
  actionFilesById: Map<string, string>,
): { filePath: string; exportName?: string } | null {
  const directFile = actionFilesById.get(actionId);
  if (directFile) {
    return { filePath: directFile };
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
    filePath: actionsFile,
    exportName,
  };
}

function resolveLayoutTemplate(layoutsDir: string, rawPage: string): string | undefined {
  const { frontmatter } = parseFrontmatter(rawPage);
  const value = frontmatter.layout;
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === "none") {
    return undefined;
  }

  if (!/^[a-zA-Z0-9/_-]+$/u.test(normalized)) {
    return undefined;
  }

  const root = path.resolve(layoutsDir);
  const candidate = path.resolve(root, `${normalized}.html`);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(candidate)) {
    return undefined;
  }

  return readFileSync(candidate, "utf8");
}

export function loadActionHandlers(serverDir: string): Record<string, ActionHandler<{ inputs: Record<string, unknown> }>> {
  const actionFiles = findActionFiles(serverDir);
  const actionFilesById = new Map(actionFiles.map((filePath) => [actionFileToId(filePath, serverDir), filePath] as const));
  const handlers = new Map<string, ActionHandler<{ inputs: Record<string, unknown> }>>();

  return new Proxy({}, {
    get(_target, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      const cached = handlers.get(property);
      if (cached) {
        return cached;
      }

      const resolved = resolveActionLocation(property, actionFilesById);
      if (!resolved) {
        return undefined;
      }

      const handler: ActionHandler<{ inputs: Record<string, unknown> }> = async (ctx) => {
        const mod = await importModuleFromFile(resolved.filePath) as Record<string, unknown>;
        const actionModule = (
          resolved.exportName
            ? (mod.default as Record<string, unknown> | undefined)?.[resolved.exportName]
              ?? (mod.actions as Record<string, unknown> | undefined)?.[resolved.exportName]
              ?? mod[resolved.exportName]
            : (mod.default as Record<string, unknown> | undefined)?.action
              ?? mod.default
              ?? (mod.action as Record<string, unknown> | undefined)
              ?? mod
        ) as { run?: unknown };

        if (typeof actionModule?.run !== "function") {
          throw new Error(
            resolved.exportName
              ? `Action module must export ${resolved.exportName} from ${resolved.filePath}`
              : `Action module must export a run() function: ${resolved.filePath}`,
          );
        }

        return (actionModule.run as ActionHandler<{ inputs: Record<string, unknown> }>)(ctx);
      };

      handlers.set(property, handler);
      return handler;
    },
  }) as Record<string, ActionHandler<{ inputs: Record<string, unknown> }>>;
}

export interface CreateSiteAppOptions {
  rootDir: string;
  config?: MdsnConfig;
  actions?: CreateHostedAppOptions["actions"];
}

export function createSiteApp(options: CreateSiteAppOptions) {
  const resolvedConfig = resolveConfig(options.config ?? {});
  const pagesDir = path.join(options.rootDir, resolvedConfig.dirs.pages);
  const serverDir = path.join(options.rootDir, resolvedConfig.dirs.server);
  const publicDir = path.join(options.rootDir, resolvedConfig.dirs.public);
  const layoutsDir = path.join(options.rootDir, resolvedConfig.dirs.layouts);
  const pageFiles = walkMarkdownFiles(pagesDir);
  const pages: Record<string, string> = {};
  const actions = options.actions ?? loadActionHandlers(serverDir);

  for (const filePath of pageFiles) {
    const routePath = pagePathToRoutePath(filePath, pagesDir);
    const pageSource = readFileSync(filePath, "utf8");
    pages[routePath] = pageSource;

    const fallbackRoutePath = defaultLocaleRouteToFallbackPath(routePath, resolvedConfig.i18n.defaultLocale);
    if (fallbackRoutePath && !pages[fallbackRoutePath]) {
      pages[fallbackRoutePath] = pageSource;
    }
  }

  const app = createHostedApp({
    pages,
    actions,
    publicDir,
    render: {
      siteTitle: resolvedConfig.site.title,
      siteDescription: resolvedConfig.site.description,
      siteBaseUrl: resolvedConfig.site.baseUrl,
      locales: resolvedConfig.i18n.locales,
      defaultLocale: resolvedConfig.i18n.defaultLocale,
      markdown: resolvedConfig.markdown,
      resolveLayoutTemplate: (_routePath, rawPage) => resolveLayoutTemplate(layoutsDir, rawPage),
    },
  });

  return app;
}
