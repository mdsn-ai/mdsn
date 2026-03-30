import type { MdsnFrontmatter } from "../types.js";

export interface FrontmatterParseResult {
  frontmatter: MdsnFrontmatter;
  body: string;
}

function parseValue(raw: string): string | number | boolean | null {
  const value = raw.trim();
  if (value === "null") {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if ((value.startsWith(`"`) && value.endsWith(`"`)) || (value.startsWith(`'`) && value.endsWith(`'`))) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatter(source: string): FrontmatterParseResult {
  if (!source.startsWith("---\n")) {
    return { frontmatter: {}, body: source };
  }

  const endMarker = source.indexOf("\n---\n", 4);
  if (endMarker === -1) {
    return { frontmatter: {}, body: source };
  }

  const frontmatterText = source.slice(4, endMarker);
  const body = source.slice(endMarker + 5);
  const frontmatter: MdsnFrontmatter = {};

  for (const line of frontmatterText.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    frontmatter[key] = parseValue(value);
  }

  return { frontmatter, body };
}
