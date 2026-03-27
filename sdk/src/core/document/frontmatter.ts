import type { FrontmatterData } from "../model/document";

function parseScalarValue(raw: string): unknown {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(raw: string): { frontmatter: FrontmatterData; body: string } {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: {}, body: raw };
  }

  const lines = raw.split(/\r?\n/);
  const frontmatter: FrontmatterData = {};
  let index = 1;

  while (index < lines.length && lines[index] !== "---") {
    const line = lines[index].trim();
    if (line) {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        throw new Error(`Invalid frontmatter line: ${line}`);
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      frontmatter[key] = parseScalarValue(value);
    }
    index += 1;
  }

  if (index >= lines.length) {
    throw new Error("Unterminated frontmatter block");
  }

  return {
    frontmatter,
    body: lines.slice(index + 1).join("\n"),
  };
}
