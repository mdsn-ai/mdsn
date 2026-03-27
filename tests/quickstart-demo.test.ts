import { beforeEach, describe, expect, it } from "vitest";
import { createFrameworkApp } from "../sdk/src/framework";
import { createStarterSite } from "../sdk/src/server/init";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

function createStarterFixture() {
  const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-starter-quickstart-"));
  createStarterSite(rootDir);
  const scopedNodeModulesDir = path.join(rootDir, "node_modules", "@mdsnai");
  mkdirSync(scopedNodeModulesDir, { recursive: true });
  symlinkSync(path.join(process.cwd(), "sdk"), path.join(scopedNodeModulesDir, "sdk"), "dir");
  return rootDir;
}

describe("quickstart guestbook demo", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = createStarterFixture();
  });

  it("supports submit then list through declared action targets with markdown responses", async () => {
    const app = createFrameworkApp({
      rootDir,
      mode: "dev",
    });

    await withServer(app, async (baseUrl) => {
      const pageResponse = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/markdown" },
      });

      const pageMarkdown = await pageResponse.text();
      expect(pageMarkdown).toContain('write submit: "/post"');
      expect(pageMarkdown).toContain('read refresh: "/list"');

      const postResponse = await fetch(`${baseUrl}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/markdown",
        },
        body: JSON.stringify({
          inputs: {
            nickname: "hencoo",
            message: "hello through route",
          },
        }),
      });

      expect(postResponse.status).toBe(200);
      expect(postResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(postResponse.text()).resolves.toContain("hello through route");

      const listResponse = await fetch(`${baseUrl}/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/markdown",
        },
        body: JSON.stringify({
          inputs: {},
        }),
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(listResponse.text()).resolves.toContain("hello through route");
    });

    rmSync(rootDir, { recursive: true, force: true });
  });
});
