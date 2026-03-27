import { spawn } from "node:child_process";
import type { Express } from "express";
import { existsSync, readFileSync, watch } from "node:fs";
import path from "node:path";
import { createFrameworkApp, type CreateFrameworkAppOptions } from "../framework/create-framework-app";
import { resolveConfig, type MdsnConfig } from "./config";
import { createDevState } from "./dev";
import { importModuleFromFile } from "./module-loader";

export type CreateFrameworkAppFn = (options: CreateFrameworkAppOptions) => Express;

export type ListenFn = (options: {
  app: Express;
  port: number;
  log: (message: string) => void;
}) => Promise<void>;

export type OpenBrowserFn = (url: string) => Promise<void> | void;

const USER_CONFIG_CANDIDATES = [
  "mdsn.config.cjs",
  "mdsn.config.js",
  "mdsn.config.json",
  "mdsn.config.ts",
  "mdsn.config.mts",
  "mdsn.config.cts",
] as const;

function formatConfigLoadError(configPath: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const extension = path.extname(configPath).toLowerCase();
  const isTypeScriptConfig = extension === ".ts" || extension === ".mts" || extension === ".cts";

  if (isTypeScriptConfig) {
    return new Error(
      `Failed to load ${path.basename(configPath)}: ${message}. `
      + "If you are using the published mdsn CLI binary, prefer mdsn.config.cjs for portable runtime loading.",
    );
  }

  return new Error(`Failed to load ${path.basename(configPath)}: ${message}`);
}

async function loadConfigFromFile(configPath: string): Promise<MdsnConfig> {
  const extension = path.extname(configPath).toLowerCase();
  if (extension === ".json") {
    return JSON.parse(readFileSync(configPath, "utf8")) as MdsnConfig;
  }

  try {
    const loadedModule = await importModuleFromFile(configPath) as Record<string, unknown>;
    return (loadedModule.default ?? loadedModule) as MdsnConfig;
  } catch (error) {
    throw formatConfigLoadError(configPath, error);
  }
}

export async function loadUserConfig(rootDir: string): Promise<MdsnConfig> {
  const availableConfigPaths = USER_CONFIG_CANDIDATES
    .map((name) => path.join(rootDir, name))
    .filter((candidatePath) => existsSync(candidatePath));

  if (availableConfigPaths.length === 0) {
    return {};
  }

  const errors: Error[] = [];

  for (const configPath of availableConfigPaths) {
    try {
      return await loadConfigFromFile(configPath);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  const details = errors.map((error) => `- ${error.message}`).join("\n");
  throw new Error(`Failed to load user config from ${rootDir}:\n${details}`);
}

export function loadBuiltConfig(distDir: string): MdsnConfig | null {
  const configPath = path.join(distDir, "mdsn.config.json");

  if (!existsSync(configPath)) {
    return null;
  }

  return JSON.parse(readFileSync(configPath, "utf8")) as MdsnConfig;
}

export async function listenOnPort(options: {
  app: Express;
  port: number;
  log: (message: string) => void;
}): Promise<void> {
  const { app, port, log } = options;

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      log(`MDSN framework server listening on http://localhost:${port}`);
      resolve();
    });

    server.on("error", reject);
  });
}

export function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? { file: "open", args: [url] }
      : process.platform === "win32"
        ? { file: "cmd", args: ["/c", "start", "", url] }
        : { file: "xdg-open", args: [url] };

  const child = spawn(command.file, command.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function startFrameworkServer(options: {
  cwd?: string;
  port?: number;
  mode?: "dev" | "start";
  createApp?: CreateFrameworkAppFn;
  listen?: ListenFn;
  openBrowser?: OpenBrowserFn;
  log?: (message: string) => void;
} = {}): Promise<void> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const distDir = path.join(cwd, "dist");
  const shouldUseDist = options.mode === "start";
  const builtConfig = shouldUseDist ? loadBuiltConfig(distDir) : null;
  const rootDir = builtConfig ? distDir : cwd;
  const config = builtConfig ?? await loadUserConfig(rootDir);
  const resolvedConfig = resolveConfig(config);
  const devState = options.mode === "dev" ? createDevState() : undefined;
  const app = (options.createApp ?? createFrameworkApp)({
    rootDir,
    mode: options.mode,
    config,
    devState,
  });

  if (devState) {
    for (const directoryName of [
      resolvedConfig.dirs.pages,
      resolvedConfig.dirs.server,
      resolvedConfig.dirs.public,
      resolvedConfig.dirs.layouts,
    ]) {
      const targetDir = path.join(rootDir, directoryName);
      if (!existsSync(targetDir)) continue;

      try {
        watch(targetDir, { recursive: true }, (_eventType, fileName) => {
          const relativeName = typeof fileName === "string" && fileName
            ? path.join(directoryName, fileName).split(path.sep).join("/")
            : directoryName;
          devState.bumpVersion(relativeName);
        });
      } catch {
        // Ignore watcher setup failures for now; the dev server remains usable without auto-reload.
      }
    }
  }

  const port = options.port ?? resolvedConfig.server.port;

  await (options.listen ?? listenOnPort)({
    app,
    port,
    log: options.log ?? console.log,
  });

  if (options.mode === "dev" && resolvedConfig.dev.openBrowser) {
    try {
      await (options.openBrowser ?? openBrowser)(`http://localhost:${port}`);
    } catch {
      // Keep the dev server usable even if the opener is unavailable.
    }
  }
}
