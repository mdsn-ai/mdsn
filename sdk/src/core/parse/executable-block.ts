import { MdsnParseError } from "../errors.js";

export interface ExecutableBlockResult {
  markdown: string;
  executableContent: string;
}

export function extractExecutableBlock(source: string): ExecutableBlockResult {
  const lines = source.split("\n");
  const executableIndices: Array<{ start: number; end: number }> = [];
  let insideFence = false;
  let currentFenceLang: string | null = null;
  let currentStart = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);

    if (!insideFence) {
      if (match) {
        insideFence = true;
        currentFenceLang = match[1] ?? "";
        currentStart = index;
      }
      continue;
    }

    if (line.trim() === "```") {
      if (currentFenceLang === "mdsn") {
        executableIndices.push({ start: currentStart, end: index });
      }
      insideFence = false;
      currentFenceLang = null;
      currentStart = -1;
    }
  }

  if (executableIndices.length > 1) {
    throw new MdsnParseError("A page may contain at most one executable mdsn block.");
  }

  if (executableIndices.length === 0) {
    return {
      markdown: source.trim(),
      executableContent: ""
    };
  }

  const executable = executableIndices[0]!;
  const executableContent = lines
    .slice(executable.start + 1, executable.end)
    .filter((line) => line.trim() !== "")
    .join("\n");

  const markdownLines = lines.filter((_, index) => index < executable.start || index > executable.end);
  return {
    markdown: markdownLines.join("\n").trim(),
    executableContent
  };
}
