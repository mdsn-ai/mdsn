import { describe, expect, it } from "vitest";
import { createHostedApp } from "../sdk/src/framework/hosted-app";

async function withServer(
  app: ReturnType<typeof createHostedApp>,
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

describe("hosted app", () => {
  const pages = {
    "/search": `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  input query!: text
  read search: "/search" (query)
  redirect "/done"
}
\`\`\`
`,
  };

  it("serves markdown by default and html for browsers", async () => {
    const app = createHostedApp({ pages });

    await withServer(app, async (baseUrl) => {
      const clientRuntimeResponse = await fetch(`${baseUrl}/__mdsn/client.js`);
      expect(clientRuntimeResponse.status).toBe(200);
      expect(clientRuntimeResponse.headers.get("content-type")).toContain("application/javascript");
      await expect(clientRuntimeResponse.text()).resolves.toContain('bootstrap.version !== "vNext"');

      const markdownResponse = await fetch(`${baseUrl}/search`);
      expect(markdownResponse.status).toBe(200);
      expect(markdownResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(markdownResponse.text()).resolves.toContain("# Search");

      const htmlResponse = await fetch(`${baseUrl}/search`, {
        headers: { Accept: "text/html" },
      });
      expect(htmlResponse.status).toBe(200);
      expect(htmlResponse.headers.get("content-type")).toContain("text/html");
      const html = await htmlResponse.text();
      expect(html).toContain('data-mdsn-block-region="search"');
      expect(html).toContain('data-mdsn-read="search::read::0"');
      expect(html).toContain('data-mdsn-redirect="search::redirect::1"');
      expect(html).toContain('data-target="/search"');
    });
  });

  it("runs declared action targets directly and returns markdown for agent callers", async () => {
    const app = createHostedApp({
      pages,
      actions: {
        search: async () => "# Updated",
      },
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Accept: "text/markdown",
        },
        body: JSON.stringify({ inputs: { query: "hello" } }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/markdown");
      await expect(response.text()).resolves.toBe("# Updated");
    });
  });
});
