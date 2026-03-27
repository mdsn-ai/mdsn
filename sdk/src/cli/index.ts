import { runBuild } from "./commands/build";
import { runCreate } from "./commands/create";
import { runDev } from "./commands/dev";
import { runStart } from "./commands/start";
import { parseCliArgs } from "./args";

export { parseCliArgs } from "./args";
export type { ParsedCliArgs } from "./args";

export type CliHandlers = {
  create?: (args: string[]) => Promise<void> | void;
  dev?: (args: string[]) => Promise<void> | void;
  build?: (args: string[]) => Promise<void> | void;
  start?: (args: string[]) => Promise<void> | void;
};

const KNOWN_COMMANDS = ["create", "dev", "build", "start"] as const;

export async function runCli(argv: string[], handlers: CliHandlers = {}): Promise<void> {
  const command = argv[0];
  const commandArgs = argv.slice(1);

  switch (command) {
    case "create":
      if (handlers.create) {
        await handlers.create(commandArgs);
        return;
      }
      await runCreate(parseCliArgs(commandArgs, { allowPort: false }));
      return;
    case "dev":
      if (handlers.dev) {
        await handlers.dev(commandArgs);
        return;
      }
      await runDev(parseCliArgs(commandArgs, { allowPort: true }));
      return;
    case "build":
      if (handlers.build) {
        await handlers.build(commandArgs);
        return;
      }
      await runBuild(parseCliArgs(commandArgs, { allowPort: false }));
      return;
    case "start":
      if (handlers.start) {
        await handlers.start(commandArgs);
        return;
      }
      await runStart(parseCliArgs(commandArgs, { allowPort: true }));
      return;
    default:
      throw new Error(`Unknown command: ${command ?? "(none)"}. Expected one of: ${KNOWN_COMMANDS.join(", ")}`);
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return typeof entry === "string" && /src[\\/]cli[\\/]index\.ts$/.test(entry);
}

if (isDirectExecution()) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
