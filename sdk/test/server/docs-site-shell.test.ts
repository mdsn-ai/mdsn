import { describe, expect, it } from "vitest";

import { createDocsSiteServer } from "../../../docs-site/src/index.js";

describe("docs-site shell", () => {
  it("renders docs routes with the current docs-site shell, locale switcher, navigation, and toc", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `---
title: Docs Home
---

# Docs Home

Welcome to docs.
`,
        "/zh/docs": `---
title: 文档首页
---

# 文档首页

欢迎来到文档。
`,
        "/docs/getting-started": `---
title: Getting Started
---

# Getting Started

Install and run.

## Setup

Install dependencies.

### Verify

Run tests.

This is **important**.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/getting-started",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("MDSN Docs");
    expect(response.body).toContain("Getting Started");
    expect(response.body).toContain('aria-current="page"');
    expect(response.body).toContain('id="docs-nav-filter"');
    expect(response.body).toContain('placeholder="Search docs..."');
    expect(response.body).toContain('<script defer src="/docs-site/docs.js"></script>');
    expect(response.body).toContain("Install and run.");
    expect(response.body).toContain('<aside class="docs-toc">');
    expect(response.body).toContain('href="#setup"');
    expect(response.body).toContain('href="#verify"');
    expect(response.body).toContain("<strong>important</strong>");
    expect(response.body).toContain('>EN</a>');
    expect(response.body).toContain('>中文</a>');
    expect(response.body).toContain('href="/getting-started"');
    expect(response.body).not.toContain('href="/docs/getting-started"');
  });

  it("falls back across locales for missing translated pages while keeping zh shell labels", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `# Docs Home`,
        "/zh/docs": `# 文档首页`,
        "/docs/build-with-mdsn": `---
title: Build with MDSN
---

# Build with MDSN

Build a docs site.

## Shell

Keep docs and shell aligned.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/zh/build-with-mdsn",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('<html lang="zh">');
    expect(response.body).toContain("Build a docs site.");
    expect(response.body).toContain("本页目录");
    expect(response.body).toContain("搜索");
    expect(response.body).toContain("/zh");
  });

  it("keeps old /docs links working as compatibility aliases", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/": `# Docs Home`,
        "/getting-started": `# Getting Started`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/getting-started",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Getting Started");
    expect(response.body).toContain('href="/getting-started"');
  });
});
