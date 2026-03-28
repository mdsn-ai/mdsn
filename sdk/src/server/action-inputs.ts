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
  const segments = splitInputPairs(source);

  for (const segment of segments) {
    const separator = segment.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const name = segment.slice(0, separator).trim();
    if (!/^[a-zA-Z_][\w-]*$/u.test(name)) {
      continue;
    }

    const value = segment.slice(separator + 1);
    inputs[name] = parseScalarToken(value);
  }

  return inputs;
}

function splitInputPairs(source: string): string[] {
  const pairs: string[] = [];
  let current = "";
  let depthObject = 0;
  let depthArray = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  const flushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) {
      pairs.push(trimmed);
    }
    current = "";
  };

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }
    if (char === "\"") {
      inDoubleQuote = true;
      current += char;
      continue;
    }
    if (char === "{") {
      depthObject += 1;
      current += char;
      continue;
    }
    if (char === "}") {
      depthObject = Math.max(0, depthObject - 1);
      current += char;
      continue;
    }
    if (char === "[") {
      depthArray += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      depthArray = Math.max(0, depthArray - 1);
      current += char;
      continue;
    }

    const isTopLevel = depthObject === 0 && depthArray === 0;
    if (isTopLevel && (char === "," || char === "，" || char === "\n" || char === "\r")) {
      flushCurrent();
      continue;
    }

    current += char;
  }

  flushCurrent();
  return pairs;
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
    .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
    .join(", ");
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
