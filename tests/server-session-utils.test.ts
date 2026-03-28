import { describe, expect, it } from "vitest";
import {
  HttpCookieJar,
  parseCookieHeader,
  renderAuthRequiredFragment,
  requireSessionFromCookie,
} from "../sdk/src/server";

describe("server session helpers", () => {
  it("parses cookie headers into a key-value object", () => {
    expect(
      parseCookieHeader("sid=abc123; theme=dark; profile=%E4%B8%AD%E6%96%87"),
    ).toEqual({
      sid: "abc123",
      theme: "dark",
      profile: "中文",
    });
  });

  it("renders a default auth-required fragment with login and register actions", () => {
    const markdown = renderAuthRequiredFragment();
    expect(markdown).toContain("## Login Status");
    expect(markdown).toContain('POST "/login" (email, password) -> login');
    expect(markdown).toContain('GET "/register" -> go_register');
    expect(markdown).toContain("block auth");
  });

  it("returns 401 markdown guidance when session cookie is missing", () => {
    const result = requireSessionFromCookie({
      cookieHeader: undefined,
      cookieName: "sid",
      resolveSession: () => null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected auth failure");
    }
    expect(result.status).toBe(401);
    expect(result.markdown).toContain('POST "/login" (email, password) -> login');
  });

  it("returns session data when cookie and resolver both succeed", () => {
    const result = requireSessionFromCookie({
      cookieHeader: "sid=token-1",
      cookieName: "sid",
      resolveSession: (sessionId) => (sessionId === "token-1"
        ? { id: "token-1", user: "agent" }
        : null),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected session success");
    }
    expect(result.sessionId).toBe("token-1");
    expect(result.session).toEqual({ id: "token-1", user: "agent" });
  });

  it("ingests set-cookie headers and replays cookies for subsequent requests", () => {
    const jar = new HttpCookieJar();
    jar.ingestSetCookieHeader([
      "sid=token-a; Path=/; HttpOnly",
      "theme=dark; Path=/",
    ]);

    expect(jar.toCookieHeader()).toContain("sid=token-a");
    expect(jar.toCookieHeader()).toContain("theme=dark");

    const headers = jar.applyToHeaders({ Accept: "text/markdown" });
    expect(headers.Cookie).toContain("sid=token-a");
    expect(headers.Cookie).toContain("theme=dark");

    jar.ingestSetCookieHeader("sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(jar.toCookieHeader()).toBe("theme=dark");
  });

  it("supports getSetCookie() response headers when present", () => {
    const jar = new HttpCookieJar();
    jar.ingestFromResponse({
      headers: {
        get: () => null,
        getSetCookie: () => ["sid=token-b; Path=/; HttpOnly"],
      },
    });

    expect(jar.get("sid")).toBe("token-b");
  });
});
