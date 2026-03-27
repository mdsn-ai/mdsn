import { describe, expect, it } from "vitest";
import { resolveRoutedPageForPath, sortRoutedPagesForMatching } from "../sdk/src/server/route-matcher";

type PageStub = {
  routePath: string;
  id: string;
};

function page(routePath: string, id: string): PageStub {
  return { routePath, id };
}

describe("framework route matcher", () => {
  it("prefers static pages over dynamic pages for the same request path", () => {
    const pages = sortRoutedPagesForMatching([
      page("/[slug]", "dynamic"),
      page("/about", "static"),
    ]);

    const matched = resolveRoutedPageForPath("/about", pages);
    expect(matched?.id).toBe("static");
  });

  it("prefers more specific static segments before dynamic segments in nested routes", () => {
    const pages = sortRoutedPagesForMatching([
      page("/docs/[slug]", "docs-dynamic"),
      page("/docs/getting-started", "docs-static"),
    ]);

    const matched = resolveRoutedPageForPath("/docs/getting-started", pages);
    expect(matched?.id).toBe("docs-static");
  });

  it("matches dynamic routes when no static route exists", () => {
    const pages = sortRoutedPagesForMatching([
      page("/blog/[slug]", "blog-dynamic"),
    ]);

    const matched = resolveRoutedPageForPath("/blog/mdsn-v1-1", pages);
    expect(matched?.id).toBe("blog-dynamic");
  });

  it("normalizes trailing slashes when matching", () => {
    const pages = sortRoutedPagesForMatching([
      page("/about", "about"),
    ]);

    const matched = resolveRoutedPageForPath("/about/", pages);
    expect(matched?.id).toBe("about");
  });

  it("returns null when no route matches", () => {
    const pages = sortRoutedPagesForMatching([
      page("/about", "about"),
      page("/blog/[slug]", "blog"),
    ]);

    const matched = resolveRoutedPageForPath("/pricing", pages);
    expect(matched).toBeNull();
  });
});
