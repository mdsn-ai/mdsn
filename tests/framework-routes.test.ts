import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  defaultLocaleRouteToFallbackPath,
  markdownPathToRoutePath,
  pagePathToRoutePath,
  routePathToMarkdownPath,
  routePathToExpressPath,
} from "../sdk/src/server/routes";
import { resolveSitePaths } from "../sdk/src/server/site";

describe("framework routes", () => {
  it("maps index pages to directory roots", () => {
    expect(pagePathToRoutePath("pages/index.md", "pages")).toBe("/");
    expect(pagePathToRoutePath("pages/blog/index.md", "pages")).toBe("/blog");
  });

  it("maps normal page files to route paths", () => {
    expect(pagePathToRoutePath("pages/about.md", "pages")).toBe("/about");
    expect(pagePathToRoutePath("pages/blog/post.md", "pages")).toBe("/blog/post");
  });

  it("maps dynamic page files to route params", () => {
    const routePath = pagePathToRoutePath("pages/blog/[slug].md", "pages");

    expect(routePath).toBe("/blog/[slug]");
    expect(routePathToExpressPath(routePath)).toBe("/blog/:slug");
  });

  it("maps route paths to markdown direct paths", () => {
    expect(routePathToMarkdownPath("/")).toBe("/index.md");
    expect(routePathToMarkdownPath("/docs")).toBe("/docs.md");
    expect(routePathToMarkdownPath("/blog/[slug]")).toBe("/blog/[slug].md");
  });

  it("maps markdown direct paths back to route paths", () => {
    expect(markdownPathToRoutePath("/index.md")).toBe("/");
    expect(markdownPathToRoutePath("/docs.md")).toBe("/docs");
    expect(markdownPathToRoutePath("/docs/index.md")).toBe("/docs");
    expect(markdownPathToRoutePath("/blog/post.md")).toBe("/blog/post");
    expect(markdownPathToRoutePath("/docs")).toBeNull();
  });

  it("maps default-locale routes to fallback unprefixed routes", () => {
    expect(defaultLocaleRouteToFallbackPath("/en", "en")).toBe("/");
    expect(defaultLocaleRouteToFallbackPath("/en/docs/getting-started", "en")).toBe("/docs/getting-started");
    expect(defaultLocaleRouteToFallbackPath("/zh/docs", "en")).toBeNull();
    expect(defaultLocaleRouteToFallbackPath("/about", "en")).toBeNull();
  });
});

describe("framework site paths", () => {
  it("resolves default site directories from cwd", () => {
    const site = resolveSitePaths("/tmp/demo-site", {
      dirs: {},
    });

    expect(site.rootDir).toBe("/tmp/demo-site");
    expect(site.pagesDir).toBe(path.join("/tmp/demo-site", "pages"));
    expect(site.serverDir).toBe(path.join("/tmp/demo-site", "server"));
    expect(site.publicDir).toBe(path.join("/tmp/demo-site", "public"));
    expect(site.layoutsDir).toBe(path.join("/tmp/demo-site", "layouts"));
  });

  it("resolves custom site directories from config", () => {
    const site = resolveSitePaths("/tmp/demo-site", {
      dirs: {
        pages: "content",
        server: "functions",
      },
    });

    expect(site.pagesDir).toBe(path.join("/tmp/demo-site", "content"));
    expect(site.serverDir).toBe(path.join("/tmp/demo-site", "functions"));
  });
});
