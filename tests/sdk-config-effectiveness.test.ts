import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import { createFrameworkApp } from "../sdk/src/framework";
import { runDev } from "../sdk/src/cli/commands/dev";
import { loadUserConfig } from "../sdk/src/server/server";

function createTempSite(): string {
  return mkdtempSync(path.join(tmpdir(), "mdsn-config-effective-"));
}

function createMockApp(): Express {
  return {
    listen: vi.fn(),
  } as unknown as Express;
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
  vi.restoreAllMocks();

  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("sdk config effectiveness", () => {
  it("uses custom pages and server directories for routing and action loading", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "content"), { recursive: true });
    mkdirSync(path.join(rootDir, "actions"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = {
  dirs: {
    pages: "content",
    server: "actions",
  },
};`,
      "utf8",
    );
    writeFileSync(
      path.join(rootDir, "content", "index.md"),
      `---
id: hello
---

# Custom dirs

<!-- mdsn:block hello -->

\`\`\`mdsn
BLOCK hello {
  INPUT text required -> name
  GET "/hello" (name) -> hello
}
\`\`\`
`,
      "utf8",
    );
    writeFileSync(
      path.join(rootDir, "actions", "hello.cjs"),
      `module.exports.action = {
  async run(ctx) {
    return "# Hello, " + String(ctx.inputs.name ?? "world") + "!";
  },
};`,
      "utf8",
    );

    const app = createFrameworkApp({
      rootDir,
      config: await loadUserConfig(rootDir),
    });

    await withServer(app, async (baseUrl) => {
      const htmlResponse = await fetch(baseUrl, {
        headers: {
          Accept: "text/html",
        },
      });
      const html = await htmlResponse.text();

      expect(htmlResponse.status).toBe(200);
      expect(html).toContain("<h1>Custom dirs</h1>");

      const actionResponse = await fetch(`${baseUrl}/hello?name=MDSN`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(actionResponse.status).toBe(200);
      await expect(actionResponse.text()).resolves.toBe("# Hello, MDSN!");
    });
  });

  it("uses custom public and layout directories at runtime", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });
    mkdirSync(path.join(rootDir, "assets"), { recursive: true });
    mkdirSync(path.join(rootDir, "templates"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = {
  dirs: {
    public: "assets",
    layouts: "templates",
  },
};`,
      "utf8",
    );
    writeFileSync(
      path.join(rootDir, "pages", "index.md"),
      `---
title: Custom Layout
layout: default
---

# Hello

\`\`\`mdsn
BLOCK home {
}
\`\`\`
`,
      "utf8",
    );
    writeFileSync(path.join(rootDir, "assets", "logo.txt"), "logo", "utf8");
    writeFileSync(
      path.join(rootDir, "templates", "default.html"),
      `<!doctype html>
<html>
  <body data-layout="custom">{{content}}</body>
</html>`,
      "utf8",
    );

    const app = createFrameworkApp({
      rootDir,
      config: await loadUserConfig(rootDir),
    });

    await withServer(app, async (baseUrl) => {
      const assetResponse = await fetch(`${baseUrl}/logo.txt`);
      expect(assetResponse.status).toBe(200);
      await expect(assetResponse.text()).resolves.toBe("logo");

      const htmlResponse = await fetch(baseUrl, {
        headers: {
          Accept: "text/html",
        },
      });
      const html = await htmlResponse.text();

      expect(htmlResponse.status).toBe(200);
      expect(html).toContain('data-layout="custom"');
      expect(html).toContain("<h1>Hello</h1>");
    });
  });

  it("applies markdown linkify and typographer settings to rendered html", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = {
  markdown: {
    linkify: false,
    typographer: true,
  },
};`,
      "utf8",
    );
    writeFileSync(
      path.join(rootDir, "pages", "index.md"),
      `Visit https://example.com -- "quote"

\`\`\`mdsn
BLOCK home {
}
\`\`\`
`,
      "utf8",
    );

    const app = createFrameworkApp({
      rootDir,
      config: await loadUserConfig(rootDir),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: {
          Accept: "text/html",
        },
      });
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).not.toContain('<a href="https://example.com">');
      expect(html).toContain("Visit https://example.com");
      expect(html).toContain("“quote”");
      expect(html).not.toContain('-- "quote"');
    });
  });

  it("opens the browser in dev mode only when dev.openBrowser is enabled", async () => {
    const enabledRoot = createTempSite();
    const disabledRoot = createTempSite();
    rootsToCleanup.push(enabledRoot, disabledRoot);

    mkdirSync(path.join(enabledRoot, "pages"), { recursive: true });
    mkdirSync(path.join(enabledRoot, "server"), { recursive: true });
    mkdirSync(path.join(disabledRoot, "pages"), { recursive: true });
    mkdirSync(path.join(disabledRoot, "server"), { recursive: true });

    writeFileSync(
      path.join(enabledRoot, "mdsn.config.cjs"),
      `module.exports = { server: { port: 4312 }, dev: { openBrowser: true } };`,
      "utf8",
    );
    writeFileSync(
      path.join(disabledRoot, "mdsn.config.cjs"),
      `module.exports = { server: { port: 4313 }, dev: { openBrowser: false } };`,
      "utf8",
    );

    const createApp = vi.fn(() => createMockApp());
    const listen = vi.fn(async () => {});
    const openBrowser = vi.fn(async () => {});

    await runDev({
      cwd: enabledRoot,
      createApp,
      listen,
      openBrowser,
      log: () => undefined,
    });

    expect(openBrowser).toHaveBeenCalledWith("http://localhost:4312");

    openBrowser.mockClear();

    await runDev({
      cwd: disabledRoot,
      createApp,
      listen,
      openBrowser,
      log: () => undefined,
    });

    expect(openBrowser).not.toHaveBeenCalled();
  });

  it("applies site metadata and i18n defaults to rendered layouts", async () => {
    const rootDir = createTempSite();
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });
    mkdirSync(path.join(rootDir, "templates"), { recursive: true });

    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = {
  site: {
    title: "Configured Site",
    description: "Configured description",
  },
  dirs: {
    layouts: "templates",
  },
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
  },
};`,
      "utf8",
    );
    writeFileSync(path.join(rootDir, "pages", "index.md"), "# Home\n", "utf8");
    writeFileSync(
      path.join(rootDir, "templates", "default.html"),
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
    writeFileSync(
      path.join(rootDir, "pages", "index.md"),
      `---
layout: default
---

# Home

\`\`\`mdsn
\`\`\`
`,
      "utf8",
    );

    const app = createFrameworkApp({
      rootDir,
      config: await loadUserConfig(rootDir),
    });

    await withServer(app, async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: {
          Accept: "text/html",
        },
      });
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain('<html lang="zh">');
      expect(html).toContain("<title>Configured Site</title>");
      expect(html).toContain('<meta name="description" content="Configured description" />');
      expect(html).toContain('data-locale="zh"');
      expect(html).toContain('data-default-locale="zh"');
    });
  });
});
