export type ParsedCliArgs = {
  cwd?: string;
  port?: number;
  positional: string[];
};

export function parseCliArgs(
  argv: string[],
  options: {
    allowPort: boolean;
  },
): ParsedCliArgs {
  const parsed: ParsedCliArgs = {
    positional: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--cwd" || token === "-C") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`Missing value for ${token}`);
      }
      parsed.cwd = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--cwd=")) {
      const value = token.slice("--cwd=".length);
      if (!value) {
        throw new Error("Missing value for --cwd");
      }
      parsed.cwd = value;
      continue;
    }

    if (token === "--port" || token === "-p") {
      if (!options.allowPort) {
        throw new Error("Option --port is only supported by dev/start");
      }
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error(`Missing value for ${token}`);
      }
      parsed.port = parsePort(value);
      index += 1;
      continue;
    }

    if (token.startsWith("--port=")) {
      if (!options.allowPort) {
        throw new Error("Option --port is only supported by dev/start");
      }
      const value = token.slice("--port=".length);
      if (!value) {
        throw new Error("Missing value for --port");
      }
      parsed.port = parsePort(value);
      continue;
    }

    if (token.startsWith("-")) {
      throw new Error(`Unknown option: ${token}`);
    }

    parsed.positional.push(token);
  }

  return parsed;
}

function parsePort(raw: string): number {
  const numeric = Number(raw);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535) {
    throw new Error(`Invalid value for --port: ${raw}`);
  }
  return numeric;
}
