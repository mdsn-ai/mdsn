function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScalarToken(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("{")
    || trimmed.startsWith("[")
    || trimmed.startsWith("\"")
    || trimmed === "true"
    || trimmed === "false"
    || trimmed === "null"
    || /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/u.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to plain string.
    }
  }

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseMarkdownInputs(source: string): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const normalized = line.replace(/^[-*+]\s+/u, "");

    const separator = normalized.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const name = normalized.slice(0, separator).trim();
    if (!/^[a-zA-Z_][\w-]*$/u.test(name)) {
      continue;
    }

    const value = normalized.slice(separator + 1);
    inputs[name] = parseScalarToken(value);
  }

  return inputs;
}

function normalizeObjectInputs(payload: Record<string, unknown>): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(payload)) {
    if (!/^[a-zA-Z_][\w-]*$/u.test(name)) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        inputs[name] = value[0];
      }
      continue;
    }

    if (typeof value === "string") {
      inputs[name] = parseScalarToken(value);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      inputs[name] = value;
      continue;
    }
  }
  return inputs;
}

export function serializeActionInputsAsMarkdown(inputs: Record<string, unknown>): string {
  return Object.entries(inputs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `- ${name}: ${JSON.stringify(value)}`)
    .join("\n");
}

export function parseActionInputs(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    return parseMarkdownInputs(payload);
  }

  if (isPlainObject(payload)) {
    return normalizeObjectInputs(payload);
  }

  return {};
}

export function normalizeActionInputPayloadToMarkdown(payload: unknown): string {
  return serializeActionInputsAsMarkdown(parseActionInputs(payload));
}
