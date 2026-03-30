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

async function getMarkdown(url: string, cookie?: string) {
  return fetch(url, {
    headers: {
      accept: "text/markdown",
      ...(cookie ? { cookie } : {})
    }
  });
}

async function postMarkdown(url: string, body: string, cookie?: string) {
  return fetch(url, {
    method: "POST",
    headers: {
      accept: "text/markdown",
      "content-type": "text/markdown",
      ...(cookie ? { cookie } : {})
    },
    body
  });
}

describe("auth-session agent-only smoke test", () => {
  it("supports self-discoverable login/register, vault access, logout, and stale-cookie rejection over HTTP only", async () => {
    const sources = await readAuthSources();
    const server = createAuthServer(sources);
    const baseUrl = await listen(createNodeHost(server, { rootRedirect: "/login" }));

    const loginPage = await getMarkdown(`${baseUrl}/login`);
    expect(loginPage.status).toBe(200);
    const loginBody = await loginPage.text();
    expect(loginBody).toContain('POST "/login" (nickname, password) -> login');
    expect(loginBody).toContain('GET "/register" -> register');
    expect(loginBody).not.toContain('POST "/vault" (message) -> save');

    const registerPage = await getMarkdown(`${baseUrl}/register`);
    expect(registerPage.status).toBe(200);
    const registerBody = await registerPage.text();
    expect(registerBody).toContain('POST "/register" (nickname, password) -> register');
    expect(registerBody).toContain('GET "/login" -> login');

    const nickname = `AgentSmoke-${Date.now().toString(36)}`;
    const register = await postMarkdown(`${baseUrl}/register`, `nickname: "${nickname}", password: "pass-1234"`);
    expect(register.status).toBe(200);
    const sessionCookie = cookieValueFromSetCookie(register.headers.get("set-cookie"));
    const registerResult = await register.text();
    expect(registerResult).toContain(`Account created for ${nickname}`);
    expect(registerResult).toContain('GET "/vault" -> open_vault');
    expect(registerResult).not.toContain('POST "/vault" (message) -> save');
    expect(sessionCookie).toMatch(/^mdsn_session=[0-9a-f-]+$/);
    expect(sessionCookie).not.toContain(nickname);

    const vaultPage = await getMarkdown(`${baseUrl}/vault`, sessionCookie);
    expect(vaultPage.status).toBe(200);
    const vaultBody = await vaultPage.text();
    expect(vaultBody).toContain(`## Welcome ${nickname}`);
    expect(vaultBody).toContain('POST "/vault" (message) -> save');
    expect(vaultBody).toContain('POST "/vault/logout" () -> logout');

    const save = await postMarkdown(`${baseUrl}/vault`, 'message: "Private note from smoke test"', sessionCookie);
    expect(save.status).toBe(200);
    const saveBody = await save.text();
    expect(saveBody).toContain("1 saved note");
    expect(saveBody).toContain("Private note from smoke test");

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
    expect(logoutBody).toContain('GET "/login" -> open_login');

    const lockedVault = await getMarkdown(`${baseUrl}/vault`, sessionCookie);
    expect(lockedVault.status).toBe(200);
    const lockedVaultBody = await lockedVault.text();
    expect(lockedVaultBody).toContain("Private notes are locked");
    expect(lockedVaultBody).not.toContain(`## Welcome ${nickname}`);

    const replayWrite = await postMarkdown(`${baseUrl}/vault`, 'message: "Replay should fail"', sessionCookie);
    expect(replayWrite.status).toBe(401);
    const replayBody = await replayWrite.text();
    expect(replayBody).toContain('GET "/login" -> recover');
  });
});
