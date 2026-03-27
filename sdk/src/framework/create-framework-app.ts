import type { ActionHandler } from "../server/action-host";
import type { MdsnConfig } from "../server/config";
import { createSiteApp } from "./site-app";

export interface CreateFrameworkAppOptions {
  rootDir: string;
  config?: MdsnConfig;
  actions?: Record<string, ActionHandler<{ inputs: Record<string, unknown> }>>;
  mode?: "dev" | "start";
  devState?: unknown;
}

export function createFrameworkApp(options: CreateFrameworkAppOptions) {
  return createSiteApp({
    rootDir: options.rootDir,
    config: options.config,
    actions: options.actions,
  });
}
