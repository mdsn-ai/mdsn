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
    if (!line || line === "```") {
      continue;
    }
    if (line.startsWith("```")) {
      continue;
    }
    if (line.startsWith("#")) {
      continue;
    }

    let normalized = line.replace(/^>\s*/u, "");
    normalized = normalized.replace(/^[-*+]\s+/u, "");
    normalized = normalized.replace(/^\d+\.\s+/u, "");
    normalized = normalized.replace(/^input\s+/iu, "");

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

export function serializeActionInputsAsMarkdown(inputs: Record<string, unknown>): string {
  return Object.entries(inputs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `- ${name}: ${JSON.stringify(value)}`)
    .join("\n");
}

export function parseActionInputs(payload: unknown): Record<string, unknown> {
  if (isPlainObject(payload)) {
    const maybeInputs = payload.inputs;
    if (isPlainObject(maybeInputs)) {
      return maybeInputs;
    }
    return payload;
  }

  if (typeof payload === "string") {
    return parseMarkdownInputs(payload);
  }

  return {};
}

export function normalizeActionInputPayloadToMarkdown(payload: unknown): string {
  return serializeActionInputsAsMarkdown(parseActionInputs(payload));
}
