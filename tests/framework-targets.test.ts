import { describe, expect, it } from "vitest";
import { isActionTarget, parseFrameworkTarget } from "../sdk/src/server/targets";

describe("framework targets", () => {
  it("parses framework action paths", () => {
    expect(parseFrameworkTarget("/search")).toEqual({
      kind: "action",
      target: "/search",
      actionPath: "search",
    });
    expect(parseFrameworkTarget("/posts/create")).toEqual({
      kind: "action",
      target: "/posts/create",
      actionPath: "posts/create",
    });
  });

  it("returns null for page resources and external urls", () => {
    expect(parseFrameworkTarget("/guestbook/current.md")).toBeNull();
    expect(parseFrameworkTarget("https://example.com/api/search")).toBeNull();
  });

  it("detects action targets", () => {
    expect(isActionTarget("/search")).toBe(true);
    expect(isActionTarget("/guestbook/current.md")).toBe(false);
  });
});
