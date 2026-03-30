import { marked } from "marked";
import { describe, expect, it } from "vitest";

import { createDocsSiteServer } from "../../../docs-site/src/index.js";

describe("docs-site root app", () => {
  it("renders docs shell with sidebar navigation, search input, and right toc", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `---
title: Docs
---

# Docs

Welcome.
`,
        "/docs/sdk": `---
title: SDK Overview
---

# SDK Overview

Intro paragraph.

## Setup

Install dependencies.

### Verify

Run tests.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/sdk",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('id="docs-nav-filter"');
    expect(response.body).toContain('href="/docs"');
    expect(response.body).toContain('aria-current="page"');
    expect(response.body).toContain("On this page");
    expect(response.body).toContain('href="#setup"');
    expect(response.body).toContain('href="#verify"');
    expect(response.body).toContain('src="/docs-site/docs.js"');
    expect(response.body).toContain('<html lang="en">');
    expect(response.body).toContain('<a href="/docs/sdk" aria-current="page">EN</a>');
    expect(response.body).toContain('<a href="/zh/docs/sdk">中文</a>');
  });

  it("supports custom third-party markdown renderer and keeps toc output", async () => {
    const markdownRenderer = {
      render(markdown: string) {
        return marked.parse(markdown) as string;
      }
    };

    const server = createDocsSiteServer({
      markdownRenderer,
      pages: {
        "/docs": `# Home`,
        "/docs/elements": `# Elements

## API

This is **important**.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/elements",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("<strong>important</strong>");
    expect(response.body).toContain('href="#api"');
    expect(response.body).toContain('<h2 id="api">');
  });

  it("serves zh docs routes with localized toc title and language switch", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": "# Docs",
        "/zh/docs": "# 文档",
        "/docs/sdk": `# SDK

## Setup
`,
        "/zh/docs/sdk": `# SDK 概览

## 安装
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/zh/docs/sdk",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('<html lang="zh">');
    expect(response.body).toContain("本页目录");
    expect(response.body).toContain('<a href="/docs/sdk">EN</a>');
    expect(response.body).toContain('<a href="/zh/docs/sdk" aria-current="page">中文</a>');
    expect(response.body).toContain("搜索文档...");
  });
});
