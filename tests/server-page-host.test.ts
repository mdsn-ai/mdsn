import { describe, expect, it } from "vitest";
import { renderHostedPage } from "../sdk/src/server/page-host";

describe("new server page host", () => {
  const rawPage = `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
block search {
  INPUT text required -> query
  GET "/search" (query) -> search
}
\`\`\`
`;

  it("returns markdown by default", () => {
    const response = renderHostedPage(rawPage, {});

    expect(response.status).toBe(200);
    expect(response.contentType).toBe("text/markdown; charset=utf-8");
    expect(response.body).toContain("# Search");
  });

  it("returns html for html accept requests", () => {
    const response = renderHostedPage(rawPage, {
      accept: "text/html",
    });

    expect(response.status).toBe(200);
    expect(response.contentType).toBe("text/html; charset=utf-8");
    expect(response.body).toContain('data-mdsn-root');
    expect(response.body).toContain('data-mdsn-block-region="search"');
    expect(response.body).toContain('data-mdsn-read="search::read::0"');
    expect(response.body).toContain('id="mdsn-bootstrap"');
    expect(response.body).toContain('"version":"vNext"');
    expect(response.body).toContain('<script src="/__mdsn/client.js" defer></script>');
  });

  it("maps action targets and applies markdown options in html mode", () => {
    const response = renderHostedPage(`---
title: Copy
---

Visit https://example.com -- "quote"

<!-- mdsn:block copy -->

\`\`\`mdsn
block copy {
  INPUT text required -> name
  GET "/hello" (name) -> hello
}
\`\`\`
`, {
      accept: "text/html",
      mapActionTarget: (target) => `/__mdsn/actions${target}`,
      markdown: {
        linkify: false,
        typographer: true,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('data-target="/__mdsn/actions/hello"');
    expect(response.body).not.toContain('data-target="/hello"');
    expect(response.body).toContain("Visit https://example.com");
    expect(response.body).toContain("“quote”");
    expect(response.body).not.toContain('<a href="https://example.com">');
  });

  it("applies layout templates with site metadata and locale", () => {
    const response = renderHostedPage(`---
layout: default
---

# Home

\`\`\`mdsn
block home {
}
\`\`\`
`, {
      accept: "text/html",
      routePath: "/zh/docs",
      siteTitle: "Configured Site",
      siteDescription: "Configured description",
      locales: ["zh", "en"],
      defaultLocale: "zh",
      layoutTemplate: `<!doctype html>
<html lang="{{locale}}">
  <head>
    <title>{{title}}</title>
    <meta name="description" content="{{description}}" />
  </head>
  <body data-locale="{{locale}}" data-default-locale="{{defaultLocale}}">
    {{content}}
  </body>
</html>`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('<html lang="zh">');
    expect(response.body).toContain("<title>Configured Site</title>");
    expect(response.body).toContain('<meta name="description" content="Configured description" />');
    expect(response.body).toContain('data-locale="zh"');
    expect(response.body).toContain('data-default-locale="zh"');
    expect(response.body).toContain("<h1>Home</h1>");
  });

  it("fills pathname and SEO/i18n layout placeholders", () => {
    const response = renderHostedPage(`---
layout: default
---

# Home

\`\`\`mdsn
block home {
}
\`\`\`
`, {
      accept: "text/html",
      routePath: "/en/docs/getting-started",
      siteTitle: "Configured Site",
      siteDescription: "Configured description",
      siteBaseUrl: "https://example.com",
      locales: ["en", "zh"],
      defaultLocale: "en",
      layoutTemplate: `<!doctype html>
<html lang="{{locale}}">
  <head>
    <link rel="canonical" href="{{canonical_url}}" />
    <link rel="alternate" type="text/markdown" href="{{markdown_alternate_url}}" />
  </head>
  <body data-pathname="{{pathname}}">
    {{hreflang_links}}
    {{content}}
  </body>
</html>`,
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('data-pathname="/en/docs/getting-started"');
    expect(response.body).toContain('href="https://example.com/en/docs/getting-started"');
    expect(response.body).toContain('href="https://example.com/en/docs/getting-started.md"');
    expect(response.body).toContain('hreflang="en"');
    expect(response.body).toContain('hreflang="zh"');
    expect(response.body).toContain('hreflang="x-default"');
  });

  it("returns 406 for unsupported accept values", () => {
    const response = renderHostedPage(rawPage, {
      accept: "application/vnd.mdsn.page+json",
    });

    expect(response.status).toBe(406);
    expect(response.contentType).toBe("text/plain; charset=utf-8");
  });
});
