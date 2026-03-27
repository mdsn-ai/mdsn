import type { CreateFrameworkAppFn, ListenFn } from "../../server/server";
import { startFrameworkServer } from "../../server/server";

export async function runStart(options: {
  cwd?: string;
  port?: number;
  positional?: string[];
  createApp?: CreateFrameworkAppFn;
  listen?: ListenFn;
  log?: (message: string) => void;
} = {}): Promise<void> {
  if ((options.positional ?? []).length > 0) {
    throw new Error("start does not accept positional arguments");
  }

  await startFrameworkServer({
    ...options,
    mode: "start",
  });
}
