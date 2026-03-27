import { describe, expect, it } from "vitest";
import {
  mapPageTargetToHttpPath,
  resolveCanonicalUrl,
  resolveHreflangLinks,
  resolveMarkdownAlternateUrl,
} from "../sdk/src/server/page-links";

describe("framework page links", () => {
  it("maps markdown load targets to host routes", () => {
    expect(mapPageTargetToHttpPath("/docs/index.md")).toBe("/docs");
    expect(mapPageTargetToHttpPath("/guide/getting-started.md")).toBe("/guide/getting-started");
  });

  it("leaves declared action targets directly callable", () => {
    expect(mapPageTargetToHttpPath("/search")).toBe("/search");
  });

  it("leaves absolute urls unchanged", () => {
    expect(mapPageTargetToHttpPath("https://example.com/docs")).toBe("https://example.com/docs");
  });

  it("builds canonical and markdown alternate urls", () => {
    expect(resolveCanonicalUrl("/docs", "https://mdsn.ai")).toBe("https://mdsn.ai/docs");
    expect(resolveMarkdownAlternateUrl("/docs", "https://mdsn.ai")).toBe("https://mdsn.ai/docs.md");
    expect(resolveMarkdownAlternateUrl("/", "https://mdsn.ai")).toBe("https://mdsn.ai/index.md");
  });

  it("renders hreflang links for localized routes", () => {
    const links = resolveHreflangLinks({
      routePath: "/en/docs/getting-started",
      locales: ["en", "zh"],
      defaultLocale: "en",
      siteBaseUrl: "https://mdsn.ai",
    });

    expect(links).toContain('hreflang="en" href="https://mdsn.ai/docs/getting-started"');
    expect(links).toContain('hreflang="zh" href="https://mdsn.ai/zh/docs/getting-started"');
    expect(links).toContain('hreflang="x-default" href="https://mdsn.ai/docs/getting-started"');
  });
});
