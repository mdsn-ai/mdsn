import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAuthServer } from "../../../examples/auth-session/src/index.js";

async function readAuthSources(): Promise<{ loginSource: string; registerSource: string; vaultSource: string }> {
  const [loginSource, registerSource, vaultSource] = await Promise.all([
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "login.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "register.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "vault.md"), "utf8")
  ]);
  return { loginSource, registerSource, vaultSource };
}

function cookieValueFromSetCookie(setCookie: string | undefined): string {
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header.");
  }
  return (setCookie.split(";", 1)[0] ?? "").replace(/^mdsn_session=/, "");
}

describe("auth-session example", () => {
  it("works as a starter-style session flow with separate login, register, vault, and logout pages", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer({
      loginSource: sources.loginSource.replace("# Sign In", "# Starter Sign In"),
      registerSource: sources.registerSource.replace("# Create Account", "# Starter Register"),
      vaultSource: sources.vaultSource.replace("# Vault", "# Starter Vault")
    });

    const loginPage = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(loginPage.body).toContain("# Starter Sign In");
    expect(loginPage.body).toContain('POST "/login" (nickname, password) -> login');
    expect(loginPage.body).toContain('GET "/register" -> register');
    expect(loginPage.body).not.toContain('POST "/vault" (message) -> save');

    const registerPage = await server.handle({
      method: "GET",
      url: "https://example.test/register",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(registerPage.body).toContain("# Starter Register");
    expect(registerPage.body).toContain('POST "/register" (nickname, password) -> register');
    expect(registerPage.body).toContain('GET "/login" -> login');

    const registerResponse = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada", password: "1234"',
      cookies: {}
    });

    expect(registerResponse.body).toContain("Account created for Ada");
    expect(registerResponse.body).toContain('GET "/vault" -> open_vault');
    expect(registerResponse.body).not.toContain("# Starter Vault");
    expect(registerResponse.body).not.toContain('POST "/vault" (message) -> save');
    const sessionCookie = cookieValueFromSetCookie(registerResponse.headers["set-cookie"]);
    expect(sessionCookie).toBeTruthy();
    expect(decodeURIComponent(sessionCookie)).not.toBe("Ada");

    const saveResponse = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "First private note"',
      cookies: {
        mdsn_session: sessionCookie
      }
    });

    expect(saveResponse.body).toContain("1 saved note");
    expect(saveResponse.body).toContain("First private note");

    const logoutResponse = await server.handle({
      method: "POST",
      url: "https://example.test/vault/logout",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: sessionCookie
      }
    });

    expect(logoutResponse.body).toContain("Signed out");
    expect(logoutResponse.body).toContain('GET "/login" -> open_login');
    expect(logoutResponse.body).not.toContain('POST "/login" (nickname, password) -> login');
    expect(logoutResponse.body).not.toContain('POST "/vault" (message) -> save');
    expect(logoutResponse.headers["set-cookie"]).toContain("Max-Age=0");

    const replayAfterLogout = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Replay should fail"',
      cookies: {
        mdsn_session: sessionCookie
      }
    });

    expect(replayAfterLogout.status).toBe(401);
    expect(replayAfterLogout.body).toContain('GET "/login" -> recover');
  });

  it("returns a recoverable vault fragment when a protected action is called without a session", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Should fail"',
      cookies: {}
    });

    expect(response.status).toBe(401);
    expect(response.body).toContain("Please sign in before saving notes");
    expect(response.body).toContain('GET "/login" -> recover');
  });

  it("treats stale cookies as signed out and sends recovery back to login", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: "missing-user"
      }
    });

    expect(pageResponse.body).toContain("# Sign In");
    expect(pageResponse.body).not.toContain('POST "/vault" (message) -> save');

    const notesResponse = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Should still fail"',
      cookies: {
        mdsn_session: "missing-user"
      }
    });

    expect(notesResponse.status).toBe(401);
    expect(notesResponse.body).toContain('GET "/login" -> recover');
  });

  it("returns a recoverable register fragment for duplicate registration", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const register = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada", password: "1234"',
      cookies: {}
    });

    const duplicate = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada", password: "1234"',
      cookies: {}
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toContain("already exists");
    expect(duplicate.body).toContain('GET "/login" -> login');
  });

  it("returns a recoverable login fragment for invalid credentials", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const invalidLogin = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada", password: "wrong"',
      cookies: {}
    });

    expect(invalidLogin.status).toBe(401);
    expect(invalidLogin.body).toContain("Invalid credentials");
    expect(invalidLogin.body).toContain('POST "/login" (nickname, password) -> login');
    expect(invalidLogin.body).toContain('GET "/register" -> register');
  });

  it("keeps a signed-in user in the vault flow when note input is empty", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const register = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada", password: "1234"',
      cookies: {}
    });
    const sessionCookie = cookieValueFromSetCookie(register.headers["set-cookie"]);

    const emptyNote = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: ""',
      cookies: {
        mdsn_session: sessionCookie
      }
    });

    expect(emptyNote.status).toBe(400);
    expect(emptyNote.body).toContain("Message is required");
    expect(emptyNote.body).toContain('POST "/vault" (message) -> save');
  });

  it("allows an agent to recover from an unauthorized vault action and then retry successfully", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);

    const unauthorized = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Retry after recover"',
      cookies: {}
    });

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body).toContain('GET "/login" -> recover');

    const register = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "RecoverUser", password: "1234"',
      cookies: {}
    });

    const sessionCookie = cookieValueFromSetCookie(register.headers["set-cookie"]);
    expect(decodeURIComponent(sessionCookie)).not.toBe("RecoverUser");

    const retry = await server.handle({
      method: "POST",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Retry after recover"',
      cookies: {
        mdsn_session: sessionCookie
      }
    });

    expect(retry.status).toBe(200);
    expect(retry.body).toContain("Retry after recover");
    expect(retry.body).toContain("1 saved note");
  });
});
