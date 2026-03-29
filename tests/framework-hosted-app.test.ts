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
BLOCK search {
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
BLOCK sync {
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

  it("allows hosted action error fragments to be overridden per app", async () => {
    const app = createHostedApp({
      pages,
      actions: {
        explode: async () => {
          throw new Error("kaboom");
        },
      },
      errorFragments: {
        actionNotAvailable: () => "# Missing action\n\nnext: contact the app owner",
        unsupportedContentType: () => "# Wrong content type\n\nnext: resend as markdown",
        internalError: ({ error }) => `# Runtime issue\n\nreason: ${error instanceof Error ? error.message : String(error)}`,
      },
    });

    await withServer(app, async (baseUrl) => {
      const missingResponse = await fetch(`${baseUrl}/done`, {
        method: "GET",
        headers: { Accept: "text/markdown" },
      });
      expect(missingResponse.status).toBe(404);
      await expect(missingResponse.text()).resolves.toContain("# Missing action");

      const writePages = {
        "/writer": `---
title: Writer
---

<!-- mdsn:block writer -->

\`\`\`mdsn
BLOCK writer {
  INPUT text required -> query
  POST "/writer_action" (query) -> send
}
\`\`\`
`,
      };
      const wrongTypeApp = createHostedApp({
        pages: writePages,
        actions: {
          writer_action: async () => "# ok",
        },
        errorFragments: {
          unsupportedContentType: () => "# Wrong content type\n\nnext: resend as markdown",
        },
      });

      await withServer(wrongTypeApp, async (writeBaseUrl) => {
        const wrongTypeResponse = await fetch(`${writeBaseUrl}/writer_action`, {
          method: "POST",
          headers: {
            "content-type": "text/plain",
            Accept: "text/markdown",
          },
          body: "query: nope",
        });
        expect(wrongTypeResponse.status).toBe(415);
        await expect(wrongTypeResponse.text()).resolves.toContain("# Wrong content type");
      });

      const errorPages = {
        "/explode": `---
title: Explode
---

<!-- mdsn:block explode -->

\`\`\`mdsn
BLOCK explode {
  GET "/explode_action" -> run
}
\`\`\`
`,
      };
      const errorApp = createHostedApp({
        pages: errorPages,
        actions: {
          explode_action: async () => {
            throw new Error("kaboom");
          },
        },
        errorFragments: {
          internalError: ({ error }) => `# Runtime issue\n\nreason: ${error instanceof Error ? error.message : String(error)}`,
        },
      });

      await withServer(errorApp, async (errorBaseUrl) => {
        const errorResponse = await fetch(`${errorBaseUrl}/explode_action`, {
          method: "GET",
          headers: { Accept: "text/markdown" },
        });
        expect(errorResponse.status).toBe(500);
        await expect(errorResponse.text()).resolves.toContain("# Runtime issue");
      });
    });
  });

  it("does not bind stream GET declarations as ordinary hosted actions", async () => {
    const app = createHostedApp({
      pages: {
        "/chat": `---
title: Chat
---

<!-- mdsn:block session -->

\`\`\`mdsn
BLOCK session {
  GET "/stream" accept:"text/event-stream"
}
\`\`\`
`,
      },
    });

    await withServer(app, async (baseUrl) => {
      const htmlResponse = await fetch(`${baseUrl}/chat`, {
        headers: { Accept: "text/html" },
      });
      expect(htmlResponse.status).toBe(200);
      const html = await htmlResponse.text();
      expect(html).not.toContain('data-mdsn-read="session::read::0"');

      const streamResponse = await fetch(`${baseUrl}/stream`, {
        headers: { Accept: "text/markdown" },
      });
      expect(streamResponse.status).toBe(404);
    });
  });
});
