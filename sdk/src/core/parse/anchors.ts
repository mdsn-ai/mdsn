import { MdsnParseError } from "../errors.js";

const anchorPattern = /<!--\s*mdsn:block\s+([a-zA-Z_][\w-]*)\s*-->/g;

export function parseAnchors(markdown: string): string[] {
  const anchors: string[] = [];
  const lines = markdown.split("\n");
  let insideFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence) {
      continue;
    }

    const matches = [...line.matchAll(anchorPattern)];
    for (const match of matches) {
      const name = match[1];
      if (!name) {
        throw new MdsnParseError("Encountered malformed block anchor.");
      }
      anchors.push(name);
    }
  }

  return anchors;
}
