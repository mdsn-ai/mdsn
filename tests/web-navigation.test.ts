import { describe, expect, it } from "vitest";
import {
  normalizeMarkdownRouteTarget,
  resolveTargetValue,
} from "../sdk/src/web/navigation";

describe("web navigation helpers", () => {
  it("normalizes markdown page targets into host route paths", () => {
    expect(normalizeMarkdownRouteTarget("/index.md", "https://mdsn.ai")).toBe("/");
    expect(normalizeMarkdownRouteTarget("/docs/index.md", "https://mdsn.ai")).toBe("/docs");
    expect(normalizeMarkdownRouteTarget("/guide/start.md?lang=zh#intro", "https://mdsn.ai")).toBe(
      "/guide/start?lang=zh#intro",
    );
  });

  it("preserves non-markdown relative targets and absolute urls", () => {
    expect(normalizeMarkdownRouteTarget("/docs", "https://mdsn.ai")).toBe("/docs");
    expect(normalizeMarkdownRouteTarget("https://example.com/docs/index.md", "https://mdsn.ai")).toBe(
      "https://example.com/docs/index.md",
    );
  });

  it("rejects empty or invalid navigation targets", () => {
    expect(normalizeMarkdownRouteTarget("", "https://mdsn.ai")).toBeNull();
    expect(normalizeMarkdownRouteTarget(null, "https://mdsn.ai")).toBeNull();
  });

  it("resolves target values from plain target strings", () => {
    expect(resolveTargetValue("/docs/index.md")).toBe("/docs/index.md");
    expect(resolveTargetValue("/docs")).toBe("/docs");
  });

  it("rejects unsupported target payloads", () => {
    expect(resolveTargetValue(null)).toBeNull();
    expect(resolveTargetValue(["/docs/index.md"])).toBeNull();
    expect(resolveTargetValue({ href: "/docs/index.md" })).toBeNull();
  });
});
