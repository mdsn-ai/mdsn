import { describe, expect, it } from "vitest";
import { createActionContextFromRequest } from "../sdk/src/server";

describe("createActionContextFromRequest", () => {
  it("maps request fields into ActionContext", () => {
    const req = {
      body: {
        inputs: { message: "hello" },
        pathname: "/chat",
      },
      params: { roomId: 42 },
      query: { page: "2", tag: ["a", "b"] },
      path: "/rooms/42",
    } as any;

    const ctx = createActionContextFromRequest(req, {
      siteTitle: "Demo",
      siteBaseUrl: "https://example.test",
    });

    expect(ctx.inputs).toEqual({ message: "hello" });
    expect(ctx.params).toEqual({ roomId: "42" });
    expect(ctx.query.get("page")).toBe("2");
    expect(ctx.query.getAll("tag")).toEqual(["a", "b"]);
    expect(ctx.pathname).toBe("/chat");
    expect(ctx.request).toBe(req);
    expect(ctx.site).toEqual({
      title: "Demo",
      baseUrl: "https://example.test",
    });
  });

  it("allows overriding derived request values", () => {
    const req = {
      body: {
        inputs: { ignored: true },
        pathname: "/ignored",
      },
      params: {},
      query: {},
      path: "/fallback",
    } as any;

    const ctx = createActionContextFromRequest(req, {
      inputs: { ok: true },
      pathname: "/custom",
      cookies: { session: "abc" },
      env: { NODE_ENV: "test" },
    });

    expect(ctx.inputs).toEqual({ ok: true });
    expect(ctx.pathname).toBe("/custom");
    expect(ctx.cookies).toEqual({ session: "abc" });
    expect(ctx.env).toEqual({ NODE_ENV: "test" });
  });
});
