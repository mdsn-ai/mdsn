import path from "node:path";
import type { ActionResult as HostedActionResult } from "../core/action";

export type ActionContext = {
  inputs: Record<string, unknown>;
  params: Record<string, string>;
  query: URLSearchParams;
  pathname: string;
  request: unknown;
  cookies: unknown;
  env: Record<string, string | undefined>;
  site: {
    title?: string;
    baseUrl?: string;
  };
};

export type ActionFailure = {
  ok: false;
  errorCode: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type ActionResult = HostedActionResult | ActionFailure;
export type ActionReturnValue = string | ActionResult;

export type ActionDefinition = {
  name?: string;
  auth?: boolean;
  run: (ctx: ActionContext) => Promise<ActionReturnValue> | ActionReturnValue;
};

export type ActionDefinitionMap = Record<string, ActionDefinition>;

export type RegisteredAction = {
  id: string;
  action: ActionDefinition;
  exportName?: string;
};

export type ActionRegistry = Map<string, ActionDefinition>;

export function defineAction(action: ActionDefinition): ActionDefinition {
  return action;
}

export function defineActions(actions: ActionDefinitionMap): ActionDefinitionMap {
  return actions;
}

export function actionFilePathToActionId(filePath: string, actionsDir: string): string {
  const normalizedPath = filePath.split(path.sep).join("/");
  const normalizedActionsDir = actionsDir.split(path.sep).join("/");
  const prefix = normalizedActionsDir.endsWith("/") ? normalizedActionsDir : `${normalizedActionsDir}/`;
  const withoutPrefix = normalizedPath.startsWith(prefix) ? normalizedPath.slice(prefix.length) : normalizedPath;
  return withoutPrefix.replace(/\.[^.]+$/, "");
}

function normalizeMultiActionBaseId(actionId: string): string {
  if (actionId === "actions") {
    return "";
  }
  if (actionId.endsWith("/actions")) {
    return actionId.slice(0, -"/actions".length);
  }
  return actionId;
}

export function actionExportNameToActionId(filePath: string, actionsDir: string, exportName?: string): string {
  const fileActionId = actionFilePathToActionId(filePath, actionsDir);
  if (!exportName) {
    return fileActionId;
  }

  const baseId = normalizeMultiActionBaseId(fileActionId);
  return baseId ? `${baseId}/${exportName}` : exportName;
}

function isActionDefinition(value: unknown): value is ActionDefinition {
  return !!value && typeof value === "object" && typeof (value as { run?: unknown }).run === "function";
}

function actionDefinitionEntriesFromMap(candidate: unknown): RegisteredAction[] | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const entries = Object.entries(candidate as Record<string, unknown>)
    .filter(([key]) => !["default", "action", "actions", "__esModule"].includes(key));

  if (entries.length === 0 || !entries.every(([, value]) => isActionDefinition(value))) {
    return null;
  }

  return entries.map(([exportName, action]) => ({
    id: exportName,
    exportName,
    action: action as ActionDefinition,
  }));
}

export function resolveActionModuleEntries(actionModule: Record<string, unknown>, filePath: string): RegisteredAction[] {
  const singleCandidates = [
    actionModule.default,
    actionModule.action,
    actionModule,
  ];

  for (const candidate of singleCandidates) {
    if (isActionDefinition(candidate)) {
      return [{ id: "", action: candidate }];
    }

    if (
      candidate
      && typeof candidate === "object"
      && isActionDefinition((candidate as { action?: unknown }).action)
    ) {
      return [{ id: "", action: (candidate as { action: ActionDefinition }).action }];
    }
  }

  const mapCandidates = [
    (actionModule.default as { actions?: unknown } | undefined)?.actions,
    actionModule.actions,
    actionModule.default,
    actionModule,
  ];

  for (const candidate of mapCandidates) {
    const entries = actionDefinitionEntriesFromMap(candidate);
    if (entries) {
      return entries;
    }
  }

  throw new Error(`Expected action module at ${filePath} to export defineAction() or defineActions() results`);
}

export function createActionRegistry(entries: RegisteredAction[]): ActionRegistry {
  return new Map(entries.map((entry) => [entry.id, entry.action] as const));
}

export function resolveActionById(registry: ActionRegistry, id: string): ActionDefinition | undefined {
  return registry.get(id);
}
