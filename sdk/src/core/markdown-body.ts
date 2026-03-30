import { MdsnParseError } from "./errors.js";

function splitMarkdownBody(body: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }

    if (char === "\"") {
      current += char;
      inString = !inString;
      continue;
    }

    if (!inString && (char === "," || char === "\n")) {
      const trimmed = current.trim();
      if (trimmed) {
        parts.push(trimmed);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed) {
    parts.push(trimmed);
  }

  return parts;
}

export function parseMarkdownBody(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of splitMarkdownBody(body)) {
    const match = part.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.+)$/);
    if (!match) {
      throw new MdsnParseError(`Invalid markdown body line: ${part}`);
    }

    let value: unknown;
    try {
      value = JSON.parse(match[2]!.trim());
    } catch {
      throw new MdsnParseError(`Invalid markdown body line: ${part}`);
    }

    if (typeof value !== "string") {
      throw new MdsnParseError(`Invalid markdown body line: ${part}`);
    }
    result[match[1]!] = value;
  }
  return result;
}

export function serializeMarkdownBody(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}
