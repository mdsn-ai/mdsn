import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFrameworkApp } from "../sdk/src/framework";

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

describe("examples guestbook flow", () => {
  it("uses the starter-style single-file action layout", () => {
    const rootDir = path.join(process.cwd(), "examples", "guestbook");
    expect(existsSync(path.join(rootDir, "server", "actions.cjs"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "list.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "post.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "fragment.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "store.cjs"))).toBe(false);
  });

  it("serves the guestbook page and lets fresh agents call declared targets directly", async () => {
    const app = createFrameworkApp({
      rootDir: `${process.cwd()}/examples/guestbook`,
    });

    await withServer(app, async (baseUrl) => {
      const pageResponse = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/markdown" },
      });
      expect(pageResponse.status).toBe(200);
      const pageMarkdown = await pageResponse.text();
      expect(pageMarkdown).toContain("# Guestbook");
      expect(pageMarkdown).toContain('read refresh: "/list"');
      expect(pageMarkdown).toContain('write submit: "/post" (nickname, message)');

      const listResponse = await fetch(`${baseUrl}/list`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "text/markdown",
        },
        body: JSON.stringify({ inputs: {} }),
      });

      if (listResponse.status !== 200) {
        throw new Error(await listResponse.text());
      }
      expect(listResponse.status).toBe(200);
      expect(listResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(listResponse.text()).resolves.toContain("_No messages yet._");

      const postResponse = await fetch(`${baseUrl}/post`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "text/markdown",
        },
        body: JSON.stringify({
          inputs: {
            nickname: "MDSN",
            message: "Hello",
          },
        }),
      });

      expect(postResponse.status).toBe(200);
      expect(postResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(postResponse.text()).resolves.toContain("Hello");
    });
  });
});
