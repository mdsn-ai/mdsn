import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFrameworkApp } from "../sdk/src/framework";

function createTempSite(): string {
  const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-framework-site-"));
  mkdirSync(path.join(rootDir, "pages"), { recursive: true });
  mkdirSync(path.join(rootDir, "server"), { recursive: true });
  return rootDir;
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

const rootsToCleanup: string[] = [];

afterEach(() => {
  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("framework app", () => {
  it("serves markdown by default and html for browsers", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  input query!: text
  read search: "/search" (query)
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "search.cjs"),
      `module.exports.action = {
  async run(ctx) {
    return "# Result for " + String(ctx.inputs.query ?? "");
  },
};`,
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
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
      expect(html).toContain('data-mdsn-read="search::read::0"');
      expect(html).toContain('data-target="/search"');

      const unsupportedResponse = await fetch(`${baseUrl}/search`, {
        headers: { Accept: "application/vnd.mdsn.page+json" },
      });
      expect(unsupportedResponse.status).toBe(406);
    });
  });

  it("serves plain markdown docs pages that contain mdsn example fences", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "pages", "spec.md"),
      `---
title: Spec
---

# Spec

This page shows MDSN examples.

\`\`\`\`mdsn-src
# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
block guestbook {
  input nickname: text
  input message!: text
  write submit: "/post_message" (nickname, message)
}
\`\`\`
\`\`\`\`
`,
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const markdownResponse = await fetch(`${baseUrl}/spec`);
      expect(markdownResponse.status).toBe(200);
      const markdown = await markdownResponse.text();
      expect(markdown).toContain("```mdsn-src");
      expect(markdown).toContain("<!-- mdsn:block guestbook -->");

      const htmlResponse = await fetch(`${baseUrl}/spec`, {
        headers: { Accept: "text/html" },
      });
      expect(htmlResponse.status).toBe(200);
      const html = await htmlResponse.text();
      expect(html).toContain('class="language-mdsn-src"');
      expect(html).toContain("write submit");
      expect(html).not.toContain("data-mdsn-block-panel");
    });
  });

  it("rewrites redirect markdown targets to host routes in html output", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "pages", "docs"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "index.md"),
      `---
title: Home
---

# Home

<!-- mdsn:block home -->

\`\`\`mdsn
block home {
  redirect "/docs/index.md"
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "pages", "docs", "index.md"),
      "# Docs\n",
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const html = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/html" },
      }).then((response) => response.text());

      expect(html).toContain('data-mdsn-redirect="home::redirect::0"');
      expect(html).toContain('data-target="/docs"');
      expect(html).not.toContain('data-target="/docs/index.md"');
    });
  });

  it("executes action routes through the fragment contract", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  input query!: text
  read search: "/search" (query)
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "search.cjs"),
      `module.exports = {
  async run(ctx) {
    return "# Result for " + String(ctx.inputs.query ?? "");
  },
};`,
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          inputs: { query: "hello" },
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        ok: true,
        kind: "fragment",
        markdown: "# Result for hello",
        html: "<h1>Result for hello</h1>",
      });
    });
  });

  it("preserves failure envelopes from action routes", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "pages", "guestbook.md"),
      `---
title: Guestbook
---

# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
block guestbook {
  input message!: text
  write submit: "/post_message" (message)
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "server", "post_message.cjs"),
      `module.exports = {
  async run() {
    return {
      ok: false,
      errorCode: "EMPTY_MESSAGE",
      message: "Please enter a message.",
      fieldErrors: {
        message: "Please enter a message.",
      },
    };
  },
};`,
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/post_message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          inputs: { message: "" },
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        errorCode: "EMPTY_MESSAGE",
        message: "Please enter a message.",
        fieldErrors: {
          message: "Please enter a message.",
        },
      });
    });
  });

  it("serves html layouts around the rendered page", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);
    mkdirSync(path.join(rootDir, "layouts"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "pages", "search.md"),
      `---
title: Search
layout: default
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  input query!: text
  read search: "/search" (query)
}
\`\`\`
`,
      "utf8",
    );

    writeFileSync(
      path.join(rootDir, "layouts", "default.html"),
      `<!doctype html>
<html lang="{{locale}}">
  <head><title>{{title}}</title></head>
  <body>
    <div id="app">{{content}}</div>
  </body>
</html>
`,
      "utf8",
    );

    const app = createFrameworkApp({ rootDir });

    await withServer(app, async (baseUrl) => {
      const html = await fetch(`${baseUrl}/search`, {
        headers: { Accept: "text/html" },
      }).then((response) => response.text());

      expect(html).toContain("<html");
      expect(html).toContain('<div id="app">');
      expect(html).toContain("data-mdsn-block-panel");
    });
  });
});
