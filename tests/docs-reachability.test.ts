import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { createFrameworkApp } from "../sdk/src/framework";

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

function docsFileToRoute(filePath: string, pagesDir: string): string {
  const relativePath = path.relative(pagesDir, filePath).split(path.sep).join("/");
  const withoutExtension = relativePath.replace(/\.md$/u, "");

  if (withoutExtension === "index") {
    return "/";
  }

  if (withoutExtension === "docs") {
    return "/docs";
  }

  if (withoutExtension === "zh/docs") {
    return "/zh/docs";
  }

  return `/${withoutExtension}`;
}

async function withServer(
  app: ReturnType<typeof createFrameworkApp>,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = await new Promise<import("node:http").Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Expected an ephemeral TCP port");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

describe("docs reachability", () => {
  it("serves every published docs page as HTML", async () => {
    const docsRoot = path.join(process.cwd(), "docs");
    const pagesDir = path.join(docsRoot, "pages");
    const routes = walkMarkdownFiles(pagesDir)
      .filter((filePath) => !filePath.includes(`${path.sep}zh${path.sep}demos${path.sep}`))
      .map((filePath) => docsFileToRoute(filePath, pagesDir))
      .sort();

    const app = createFrameworkApp({
      rootDir: docsRoot,
      mode: "dev",
    });

    await withServer(app, async (baseUrl) => {
      const failures: Array<{ route: string; status: number; body: string }> = [];

      for (const route of routes) {
        const response = await fetch(`${baseUrl}${route}`, {
          headers: { Accept: "text/html" },
          redirect: "manual",
        });

        if (![200, 301, 302, 307, 308].includes(response.status)) {
          failures.push({
            route,
            status: response.status,
            body: await response.text(),
          });
        }
      }

      expect(failures).toEqual([]);
    });
  });
});
