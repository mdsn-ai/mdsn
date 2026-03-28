import type { ActionHandler } from "../server/action-host";
import type { MdsnConfig } from "../server/config";
import { createSiteApp } from "./site-app";

export interface CreateFrameworkAppOptions {
  rootDir: string;
  config?: MdsnConfig;
  actions?: Record<string, ActionHandler<{ inputs: Record<string, unknown> }>>;
  errorFragments?: import("./hosted-app").CreateHostedAppOptions["errorFragments"];
  mode?: "dev" | "start";
  devState?: unknown;
}

export function createFrameworkApp(options: CreateFrameworkAppOptions) {
  return createSiteApp({
    rootDir: options.rootDir,
    config: options.config,
    actions: options.actions,
    errorFragments: options.errorFragments,
  });
}
