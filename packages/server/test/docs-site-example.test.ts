import { describe, expect, it } from "vitest";

import { createDocsSiteServer } from "../../../examples/docs-site/src/index.js";

describe("docs site example", () => {
  it("renders docs routes with a docs-style html shell, active navigation, and right-side toc", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `---
title: Docs Home
---

# Docs Home

Welcome to docs.
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
      url: "https://example.test/docs/getting-started",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("Docs Home");
    expect(response.body).toContain("Getting Started");
    expect(response.body).toContain('aria-current="page"');
    expect(response.body).toContain("Install and run.");
    expect(response.body).toContain('<aside class="docs-toc">');
    expect(response.body).toContain('href="#setup"');
    expect(response.body).toContain('href="#verify"');
    expect(response.body).toContain("<strong>important</strong>");
  });
});
