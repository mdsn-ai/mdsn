import { describe, expect, it } from "vitest";
import {
  applyLayoutTemplate,
  resolveLocaleForRoutePath,
} from "../sdk/src/server/layout";

describe("framework layout", () => {
  it("applies layout placeholders for content, metadata, locale, and pathname", () => {
    const template = `<!doctype html>
<html lang="{{lang}}">
  <head>
    <title>{{title}}</title>
    <meta name="description" content="{{description}}" />
    <link rel="alternate" type="text/markdown" href="{{markdown_alternate_url}}" />
    {{hreflang_links}}
  </head>
  <body data-locale="{{locale}}" data-default-locale="{{defaultLocale}}" data-pathname="{{pathname}}">
    <main>{{content}}</main>
  </body>
</html>`;

    const html = applyLayoutTemplate(template, {
      title: "Home",
      description: "Welcome to MDSN",
      content: "<h1>Hello</h1>",
      locale: "zh",
      defaultLocale: "en",
      pathname: "/zh/docs",
      markdownAlternateUrl: "/zh/docs.md",
      hreflangLinks: '<link rel="alternate" hreflang="en" href="/docs" />',
    });

    expect(html).toContain('<html lang="zh">');
    expect(html).toContain("<title>Home</title>");
    expect(html).toContain('content="Welcome to MDSN"');
    expect(html).toContain('data-locale="zh"');
    expect(html).toContain('data-default-locale="en"');
    expect(html).toContain('data-pathname="/zh/docs"');
    expect(html).toContain('rel="alternate" type="text/markdown" href="/zh/docs.md"');
    expect(html).toContain('hreflang="en" href="/docs"');
    expect(html).toContain("<main><h1>Hello</h1></main>");
  });

  it("falls back missing optional placeholders to empty strings", () => {
    const html = applyLayoutTemplate("{{title}}|{{description}}|{{content}}", {
      title: "",
      description: "",
      content: "",
      locale: "en",
      defaultLocale: "en",
    });

    expect(html).toBe("||");
  });

  it("resolves locale from route prefix when available", () => {
    expect(resolveLocaleForRoutePath("/zh/docs", ["en", "zh"], "en")).toBe("zh");
    expect(resolveLocaleForRoutePath("/en", ["en", "zh"], "en")).toBe("en");
  });

  it("falls back to default locale for unprefixed routes", () => {
    expect(resolveLocaleForRoutePath("/docs", ["en", "zh"], "en")).toBe("en");
    expect(resolveLocaleForRoutePath("/", ["en", "zh"], "en")).toBe("en");
  });
});
