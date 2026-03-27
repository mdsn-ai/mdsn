import type express from "express";
import { statSync } from "node:fs";
import path from "node:path";
import {
  actionExportNameToActionId,
  createActionRegistry,
  resolveActionModuleEntries,
  type ActionContext,
  type ActionDefinition,
  type ActionRegistry,
} from "./action";
import { importModuleFromFile } from "./module-loader";

function toPosixRelativePath(baseDir: string, filePath: string): string {
  return path.relative(baseDir, filePath).split(path.sep).join("/");
}

export function summarizeActionInputs(inputs: Record<string, unknown>): string {
  try {
    const serialized = JSON.stringify(inputs);
    if (!serialized) {
      return "{}";
    }
    return serialized.length > 240 ? `${serialized.slice(0, 237)}...` : serialized;
  } catch {
    return "[unserializable inputs]";
  }
}

export function createActionFilesSignature(actionFiles: string[], actionsDir: string): string {
  return actionFiles.map((filePath) => {
    const relativePath = toPosixRelativePath(actionsDir, filePath);

    try {
      const stats = statSync(filePath);
      return `${relativePath}:${stats.mtimeMs}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return `${relativePath}:missing`;
      }
      throw error;
    }
  }).join("|");
}

export async function loadActionRegistry(
  actionFiles: string[],
  actionsDir: string,
  options: {
    fresh?: boolean;
  } = {},
): Promise<ActionRegistry> {
  const entries: Array<{ id: string; action: ActionDefinition }> = [];

  for (const filePath of actionFiles) {
    const actionModule = await importModuleFromFile(filePath, { fresh: options.fresh }) as Record<string, unknown>;
    const actionEntries = resolveActionModuleEntries(actionModule, filePath);
    const relativePath = toPosixRelativePath(actionsDir, filePath);

    for (const entry of actionEntries) {
      entries.push({
        id: actionExportNameToActionId(relativePath, "", entry.exportName),
        action: entry.action,
      });
    }
  }

  return createActionRegistry(entries);
}

export function createActionContext(
  req: express.Request,
  siteTitle?: string,
  siteBaseUrl?: string,
): ActionContext {
  const body = (req.body ?? {}) as {
    inputs?: Record<string, unknown>;
    pathname?: string;
  };

  return {
    inputs: body.inputs ?? {},
    params: Object.fromEntries(Object.entries(req.params).map(([key, value]) => [key, String(value)])),
    query: new URLSearchParams(
      Object.entries(req.query).flatMap(([key, value]) => {
        if (value === undefined) return [];
        if (Array.isArray(value)) {
          return value.map((item) => [key, String(item)] as [string, string]);
        }
        return [[key, String(value)] as [string, string]];
      }),
    ),
    pathname: typeof body.pathname === "string" ? body.pathname : req.path,
    request: req,
    cookies: {},
    env: process.env,
    site: {
      title: siteTitle,
      baseUrl: siteBaseUrl,
    },
  };
}
