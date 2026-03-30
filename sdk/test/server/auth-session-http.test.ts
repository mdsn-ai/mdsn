import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createAuthServer } from "../../../examples/auth-session/src/index.js";
import { createNodeHost } from "../../src/server/index.js";

const servers = new Set<http.Server>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            servers.delete(server);
            resolve();
          });
        })
    )
  );
});

async function listen(listener: http.RequestListener): Promise<string> {
  const server = http.createServer(listener);
  servers.add(server);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function readAuthSources(): Promise<{ loginSource: string; registerSource: string; vaultSource: string }> {
  const [loginSource, registerSource, vaultSource] = await Promise.all([
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "login.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "register.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "pages", "vault.md"), "utf8")
  ]);
  return { loginSource, registerSource, vaultSource };
}

function cookieValueFromSetCookie(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header.");
  }
  return setCookie.split(";", 1)[0] ?? "";
}

describe("auth-session example over real node http", () => {
  it("keeps the full markdown flow intact across login/register pages, vault, logout, and recovery", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);
    const baseUrl = await listen(createNodeHost(server, { rootRedirect: "/login" }));

    const loginPage = await fetch(`${baseUrl}/login`, {
      headers: {
        accept: "text/markdown"
      }
    });
    expect(loginPage.status).toBe(200);
    const loginBody = await loginPage.text();
    expect(loginBody).toContain('POST "/login" (nickname, password) -> login');
    expect(loginBody).toContain('GET "/register" -> register');
    expect(loginBody).not.toContain('POST "/vault" (message) -> save');

    const registerPage = await fetch(`${baseUrl}/register`, {
      headers: {
        accept: "text/markdown"
      }
    });
    expect(registerPage.status).toBe(200);
    const registerPageBody = await registerPage.text();
    expect(registerPageBody).toContain('POST "/register" (nickname, password) -> register');
    expect(registerPageBody).toContain('GET "/login" -> login');

    const register = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "HttpAgent", password: "pass-1234"'
    });
    expect(register.status).toBe(200);
    const sessionCookie = cookieValueFromSetCookie(register.headers.get("set-cookie"));
    const registerBody = await register.text();
    expect(registerBody).toContain("Account created for HttpAgent");
    expect(registerBody).toContain('GET "/vault" -> open_vault');
    expect(registerBody).not.toContain('POST "/vault" (message) -> save');

    const save = await fetch(`${baseUrl}/vault`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown",
        cookie: sessionCookie
      },
      body: 'message: "A note sent over real HTTP"'
    });
    expect(save.status).toBe(200);
    const saveBody = await save.text();
    expect(saveBody).toContain("1 saved note");
    expect(saveBody).toContain("A note sent over real HTTP");

    const saveHtml = await fetch(`${baseUrl}/vault`, {
      method: "POST",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown",
        cookie: sessionCookie
      },
      body: 'message: "Stay on the vault page"'
    });
    expect(saveHtml.status).toBe(200);
    const saveHtmlBody = await saveHtml.text();
    expect(saveHtmlBody).toContain('data-mdsn-block="vault"');
    expect(saveHtmlBody).toContain('action="/vault"');
    expect(saveHtmlBody).not.toContain('data-mdsn-continue-target="/vault"');

    const logout = await fetch(`${baseUrl}/vault/logout`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        cookie: sessionCookie
      }
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    const logoutBody = await logout.text();
    expect(logoutBody).toContain("Signed out");
    expect(logoutBody).toContain('GET "/login" -> open_login');
    expect(logoutBody).not.toContain('POST "/vault" (message) -> save');

    const replayAfterLogout = await fetch(`${baseUrl}/vault`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown",
        cookie: sessionCookie
      },
      body: 'message: "Replay should fail"'
    });
    expect(replayAfterLogout.status).toBe(401);
    const replayAfterLogoutBody = await replayAfterLogout.text();
    expect(replayAfterLogoutBody).toContain('GET "/login" -> recover');

    const notesAfterLogout = await fetch(`${baseUrl}/vault`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown",
        cookie: "mdsn_session=stale-user"
      },
      body: 'message: "Should fail"'
    });
    expect(notesAfterLogout.status).toBe(401);
    const notesAfterLogoutBody = await notesAfterLogout.text();
    expect(notesAfterLogoutBody).toContain('GET "/login" -> recover');
  });

  it("supports non-ascii nicknames by encoding the session cookie value", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);
    const baseUrl = await listen(createNodeHost(server, { rootRedirect: "/login" }));

    const register = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "哈哈", password: "pass-1234"'
    });

    expect(register.status).toBe(200);
    const setCookie = register.headers.get("set-cookie");
    expect(setCookie).toContain("mdsn_session=");
    expect(setCookie).not.toContain("%E5%93%88%E5%93%88");
    expect(setCookie).not.toContain("哈哈");
    const registerBody = await register.text();
    expect(registerBody).toContain("Account created for 哈哈");
  });
});
