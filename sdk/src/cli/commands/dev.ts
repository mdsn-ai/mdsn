import type { CreateFrameworkAppFn, ListenFn, OpenBrowserFn } from "../../server/server";
import { startFrameworkServer } from "../../server/server";

export async function runDev(options: {
  cwd?: string;
  port?: number;
  positional?: string[];
  createApp?: CreateFrameworkAppFn;
  listen?: ListenFn;
  openBrowser?: OpenBrowserFn;
  log?: (message: string) => void;
} = {}): Promise<void> {
  if ((options.positional ?? []).length > 0) {
    throw new Error("dev does not accept positional arguments");
  }

  await startFrameworkServer({
    ...options,
    mode: "dev",
  });
}
