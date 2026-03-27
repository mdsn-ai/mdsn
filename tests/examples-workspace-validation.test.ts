import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parsePageDefinition } from "../sdk/src/core";

const projectRoot = process.cwd();

function walkMarkdownFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && absolutePath.endsWith(".md")) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe("examples workspace validation", () => {
  it("parses every example page that declares an mdsn code block", () => {
    const markdownFiles = walkMarkdownFiles(path.join(projectRoot, "examples")).sort();
    const pageFiles = markdownFiles.filter((markdownFile) =>
      readFileSync(markdownFile, "utf8").includes("```mdsn"),
    );

    expect(pageFiles.length).toBeGreaterThan(0);

    for (const markdownFile of pageFiles) {
      const source = readFileSync(markdownFile, "utf8");

      expect(() => {
        parsePageDefinition(source);
      }, `failed to parse ${path.relative(projectRoot, markdownFile)}`).not.toThrow();
    }
  });
});
