import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { readFile } from "node:fs/promises";

let activeServer: Server | null = null;

async function withServer(
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const mod = await import("../examples/react-guestbook/server");
  const server = await mod.startReactGuestbookDemo({ port: 0 });
  activeServer = server;

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address");
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
    activeServer = null;
  }
}

afterEach(async () => {
  if (!activeServer) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    activeServer?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  activeServer = null;
});

describe("react guestbook demo", () => {
  it("uses only public sdk entry points in the demo source", async () => {
    const clientSource = await readFile(
      new URL("../examples/react-guestbook/client/main.tsx", import.meta.url),
      "utf8",
    );
    const actionsSource = await readFile(
      new URL("../examples/react-guestbook/server/actions.ts", import.meta.url),
      "utf8",
    );
    const serverSource = await readFile(
      new URL("../examples/react-guestbook/server.ts", import.meta.url),
      "utf8",
    );

    expect(clientSource).not.toContain("sdk/src/");
    expect(actionsSource).not.toContain("sdk/src/");
    expect(serverSource).not.toContain("sdk/src/");
    expect(clientSource).toContain('@mdsnai/sdk/web');
    expect(actionsSource).toContain('@mdsnai/sdk/server');
  });

  it("serves a react shell, page markdown, and direct markdown actions", async () => {
    await withServer(async (baseUrl) => {
      const pageResponse = await fetch(`${baseUrl}/page.md`);
      expect(pageResponse.status).toBe(200);
      await expect(pageResponse.text()).resolves.toContain("<!-- mdsn:block guestbook -->");

      const shellResponse = await fetch(`${baseUrl}/`);
      expect(shellResponse.status).toBe(200);
      expect(shellResponse.headers.get("content-type")).toContain("text/html");
      await expect(shellResponse.text()).resolves.toContain("react-guestbook-root");

      const postResponse = await fetch(`${baseUrl}/post`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: [
          'nickname: "ReactUser"',
          'message: "Hello from React demo"',
        ].join("\n"),
      });

      expect(postResponse.status).toBe(200);
      const postMarkdown = await postResponse.text();
      expect(postMarkdown).toContain("Hello from React demo");
      expect(postMarkdown).toContain("```mdsn");
    });
  });

  it("uses starter-style page and single-file actions", async () => {
    const pageSource = await readFile(
      new URL("../examples/react-guestbook/pages/index.md", import.meta.url),
      "utf8",
    );
    const actionsSource = await readFile(
      new URL("../examples/react-guestbook/server/actions.ts", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("<!-- mdsn:block guestbook -->");
    expect(actionsSource).toContain("defineActions");
    expect(actionsSource).toContain("list:");
    expect(actionsSource).toContain("post:");
  });
});
