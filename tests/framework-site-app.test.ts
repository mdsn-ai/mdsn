import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSiteApp, loadActionHandlers } from "../sdk/src/framework/site-app";

const rootsToCleanup: string[] = [];

afterEach(() => {
  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

async function withServer(
  app: ReturnType<typeof createSiteApp>,
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

describe("site app", () => {
  it("serves markdown pages from rootDir/pages", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages", "docs"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "docs", "index.md"),
      `---
title: Docs
---

# Docs

<!-- mdsn:block docs -->

\`\`\`mdsn
block docs {
  GET "/" -> go_login
}
\`\`\`
`,
      "utf8",
    );

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const clientRuntimeResponse = await fetch(`${baseUrl}/__mdsn/client.js`);
      expect(clientRuntimeResponse.status).toBe(200);
      expect(clientRuntimeResponse.headers.get("content-type")).toContain("application/javascript");
      await expect(clientRuntimeResponse.text()).resolves.toContain('bootstrap.version !== "vNext"');

      const markdownResponse = await fetch(`${baseUrl}/docs`);
      expect(markdownResponse.status).toBe(200);
      expect(markdownResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(markdownResponse.text()).resolves.toContain("# Docs");

      const htmlResponse = await fetch(`${baseUrl}/docs`, {
        headers: { Accept: "text/html" },
      });
      expect(htmlResponse.status).toBe(200);
      const html = await htmlResponse.text();
      expect(html).toContain('data-mdsn-block-region="docs"');
      expect(html).toContain('data-mdsn-read="docs::read::0"');
    });
  });

  it("loads action handlers from rootDir/server automatically", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  INPUT text required -> query
  POST "/search_action" (query) -> search
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "search_action.cjs"),
      `module.exports.action = {
  async run(ctx) {
    return "# Result for " + String(ctx.inputs.query ?? "");
  },
};
`,
      "utf8",
    );

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/search_action`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: 'query: "hello"',
      });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("# Result for hello");

      const markdownPayloadResponse = await fetch(`${baseUrl}/search_action`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: "query: hello-markdown",
      });

      expect(markdownPayloadResponse.status).toBe(200);
      await expect(markdownPayloadResponse.text()).resolves.toBe("# Result for hello-markdown");

      const plainTextPayloadResponse = await fetch(`${baseUrl}/search_action`, {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          Accept: "text/markdown",
        },
        body: "query: hello-plain",
      });

      expect(plainTextPayloadResponse.status).toBe(415);
      await expect(plainTextPayloadResponse.text()).resolves.toContain("Unsupported content type");
    });
  });

  it("does not treat TypeScript files as runnable framework action modules", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  POST "/search_action" () -> search
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "search.ts"),
      `export default {
  async run() {
    return "# Result";
  },
};
`,
      "utf8",
    );

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/search_action`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: "",
      });

      expect(response.status).toBe(404);
      await expect(response.text()).resolves.toContain("not available");
    });
  });

  it("does not treat server/lib modules as runnable framework action modules", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server", "lib"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  POST "/search_action" () -> search
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "search_action.cjs"),
      `module.exports = {
  async run() {
    return "# Result";
  },
};
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "lib", "helper.cjs"),
      `module.exports = {
  async run() {
    return "# Hidden helper";
  },
};
`,
      "utf8",
    );

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const okResponse = await fetch(`${baseUrl}/search_action`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: "",
      });

      expect(okResponse.status).toBe(200);
      await expect(okResponse.text()).resolves.toContain("# Result");

      const helperResponse = await fetch(`${baseUrl}/lib/helper`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: "",
      });

      expect(helperResponse.status).toBe(404);
    });
  });

  it("supports custom pages/server/public directories from config", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "content"), { recursive: true });
    mkdirSync(path.join(rootDir, "actions"), { recursive: true });
    mkdirSync(path.join(rootDir, "assets"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "content", "index.md"),
      `---
title: Custom
---

# Custom

<!-- mdsn:block custom -->

\`\`\`mdsn
block custom {
  INPUT text required -> name
  POST "/hello" (name) -> hello
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "actions", "hello.cjs"),
      `module.exports.action = {
  async run(ctx) {
    return "# Hello " + String(ctx.inputs.name ?? "");
  },
};
`,
      "utf8",
    );

    writeFileSync(path.join(rootDir, "assets", "logo.txt"), "logo", "utf8");

    const app = createSiteApp({
      rootDir,
      config: {
        dirs: {
          pages: "content",
          server: "actions",
          public: "assets",
        },
      },
    });

    await withServer(app, async (baseUrl) => {
      const assetResponse = await fetch(`${baseUrl}/logo.txt`);
      expect(assetResponse.status).toBe(200);
      await expect(assetResponse.text()).resolves.toBe("logo");

      const markdownResponse = await fetch(baseUrl);
      expect(markdownResponse.status).toBe(200);
      await expect(markdownResponse.text()).resolves.toContain("# Custom");

      const actionResponse = await fetch(`${baseUrl}/hello`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: 'name: "MDSN"',
      });

      expect(actionResponse.status).toBe(200);
      await expect(actionResponse.text()).resolves.toBe("# Hello MDSN");
    });
  });

  it("applies layout, markdown, locale, and site config to html responses", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages", "zh"), { recursive: true });
    mkdirSync(path.join(rootDir, "layouts"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "zh", "docs.md"),
      `---
layout: default
---

Visit https://example.com -- "quote"

<!-- mdsn:block docs -->

\`\`\`mdsn
block docs {
  INPUT text required -> query
  GET "/search" (query) -> search
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "layouts", "default.html"),
      `<!doctype html>
<html lang="{{locale}}">
  <head>
    <title>{{title}}</title>
    <meta name="description" content="{{description}}" />
  </head>
  <body data-locale="{{locale}}" data-default-locale="{{defaultLocale}}">
    {{content}}
  </body>
</html>`,
      "utf8",
    );

    const app = createSiteApp({
      rootDir,
      config: {
        site: {
          title: "Configured Site",
          description: "Configured description",
        },
        markdown: {
          linkify: false,
          typographer: true,
        },
        i18n: {
          defaultLocale: "zh",
          locales: ["zh", "en"],
        },
      },
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/zh/docs`, {
        headers: { Accept: "text/html" },
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('<html lang="zh">');
      expect(html).toContain("<title>Configured Site</title>");
      expect(html).toContain('<meta name="description" content="Configured description" />');
      expect(html).toContain('data-locale="zh"');
      expect(html).toContain('data-default-locale="zh"');
      expect(html).toContain('data-target="/search"');
      expect(html).toContain("Visit https://example.com");
      expect(html).toContain("“quote”");
      expect(html).not.toContain('<a href="https://example.com">');
    });
  });

  it("loads multiple actions from a root actions.cjs module", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "index.md"),
      `---
title: Guestbook
---

# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
block guestbook {
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (message) -> submit
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "actions.cjs"),
      `module.exports = {
  list: {
    async run() {
      return "# Empty";
    },
  },
  post: {
    async run() {
      return "# Updated";
    },
  },
};
`,
      "utf8",
    );

    const handlers = loadActionHandlers(path.join(rootDir, "server"));
    expect(typeof handlers.list).toBe("function");
    expect(typeof handlers.post).toBe("function");

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const listResponse = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });
      expect(listResponse.status).toBe(200);
      await expect(listResponse.text()).resolves.toContain("# Empty");

      const postResponse = await fetch(`${baseUrl}/post`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: 'message: "Hello"',
      });
      expect(postResponse.status).toBe(200);
      await expect(postResponse.text()).resolves.toContain("# Updated");
    });
  });

  it("matches dynamic page routes at runtime", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages", "blog"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "blog", "[slug].md"),
      `---
title: Dynamic Post
---

# Dynamic Post

\`\`\`mdsn
block post {
}
\`\`\`
`,
      "utf8",
    );

    const app = createSiteApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/blog/hello-world`, {
        headers: { Accept: "text/html" },
      });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain("<h1>Dynamic Post</h1>");
    });
  });

  it("serves default-locale pages from unprefixed fallback routes", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-site-app-"));
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages", "en"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "en", "docs.md"),
      `---
title: English Docs
---

# English Docs

\`\`\`mdsn
block docs {
}
\`\`\`
`,
      "utf8",
    );

    const app = createSiteApp({
      rootDir,
      config: {
        i18n: {
          defaultLocale: "en",
          locales: ["en", "zh"],
        },
      },
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/docs`, {
        headers: { Accept: "text/html" },
      });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain("<h1>English Docs</h1>");
    });
  });
});
