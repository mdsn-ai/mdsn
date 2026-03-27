function trimTrailingBlankLines(value: string): string {
  return value.replace(/\n+$/u, "\n");
}

export function extractExecutableMdsnBlocks(markdown: string): {
  markdownWithoutMdsn: string;
  blocks: string[];
} {
  const lines = markdown.split(/\r?\n/);
  const keptLines: string[] = [];
  const blocks: string[] = [];
  let index = 0;
  let activeFence: { marker: string; info: string } | null = null;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const info = fenceMatch[2].trim();

      if (activeFence) {
        if (trimmed === activeFence.marker) {
          activeFence = null;
        }
        keptLines.push(line);
        index += 1;
        continue;
      }

      if (marker === "```" && info === "mdsn") {
        index += 1;
        const blockLines: string[] = [];
        while (index < lines.length && lines[index].trim() !== "```") {
          blockLines.push(lines[index]);
          index += 1;
        }
        if (index >= lines.length) {
          throw new Error("Unterminated mdsn code block");
        }
        blocks.push(blockLines.join("\n"));
        index += 1;
        continue;
      }

      activeFence = { marker, info };
      keptLines.push(line);
      index += 1;
      continue;
    }

    keptLines.push(line);
    index += 1;
  }

  return {
    markdownWithoutMdsn: trimTrailingBlankLines(keptLines.join("\n")),
    blocks,
  };
}

export function extractBlockAnchors(markdown: string): string[] {
  const anchors: string[] = [];
  let activeFence: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (activeFence) {
        if (trimmed === activeFence) {
          activeFence = null;
        }
      } else {
        activeFence = marker;
      }
      continue;
    }

    if (activeFence) {
      continue;
    }

    const anchorMatch = trimmed.match(/^<!--\s*mdsn:block\s+([a-zA-Z_][\w-]*)\s*-->$/);
    if (anchorMatch) {
      anchors.push(anchorMatch[1]);
    }
  }

  return anchors;
}
