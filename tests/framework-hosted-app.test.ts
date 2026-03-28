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
  INPUT text required -> query
  GET "/search_action" (query) -> search
  GET "/done" -> finish
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
      expect(html).toContain('data-mdsn-read="search::read::1"');
      expect(html).toContain('data-target="/search_action"');
    });
  });

  it("runs declared action targets directly and returns markdown for agent callers", async () => {
    const app = createHostedApp({
      pages,
      actions: {
        search_action: async () => "# Updated",
      },
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/search_action?query=hello`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/markdown");
      await expect(response.text()).resolves.toBe("# Updated");
    });
  });

  it("routes GET and POST actions by declared verb for the same target", async () => {
    const app = createHostedApp({
      pages: {
        "/entry": `---
title: Entry
---

<!-- mdsn:block sync -->

\`\`\`mdsn
block sync {
  INPUT text -> query
  GET "/dual" (query) -> preview
  POST "/dual" (query) -> commit
}
\`\`\`
`,
      },
      actions: {
        dual: async (ctx) => `# ${String(ctx.inputs.query ?? "")}`,
      },
    });

    await withServer(app, async (baseUrl) => {
      const readResponse = await fetch(`${baseUrl}/dual?query=from-get`, {
        method: "GET",
        headers: { Accept: "text/markdown" },
      });
      expect(readResponse.status).toBe(200);
      await expect(readResponse.text()).resolves.toBe("# from-get");

      const writeResponse = await fetch(`${baseUrl}/dual`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: 'query: "from-post"',
      });
      expect(writeResponse.status).toBe(200);
      await expect(writeResponse.text()).resolves.toBe("# from-post");
    });
  });
});
