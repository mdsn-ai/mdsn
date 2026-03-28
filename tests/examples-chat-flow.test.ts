import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseFragment } from "@mdsnai/sdk/web";
import { extractChatMessages } from "../examples/chat/client/model";

let activeServer: Server | null = null;
let activeDbDir: string | null = null;

function toMarkdownInputs(inputs: Record<string, unknown>): string {
  return Object.entries(inputs)
    .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
    .join("\n");
}

async function withServer(
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const mod = await import("../examples/chat/server");
  const dbDir = await mkdtemp(path.join(os.tmpdir(), "mdsn-chat-demo-"));
  activeDbDir = dbDir;
  const server = await mod.startVueChatDemo({ port: 0, dbPath: path.join(dbDir, "chat.sqlite") });
  activeServer = server;

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    activeServer = null;
    await rm(dbDir, { recursive: true, force: true });
    activeDbDir = null;
  }
}

afterEach(async () => {
  if (!activeServer) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    activeServer?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  activeServer = null;
  if (activeDbDir) {
    await rm(activeDbDir, { recursive: true, force: true });
    activeDbDir = null;
  }
});

describe("examples chat flow", () => {
  it("uses a page file and single-file server actions", async () => {
    const loginPageSource = await readFile(
      new URL("../examples/chat/pages/index.md", import.meta.url),
      "utf8",
    );
    const registerPageSource = await readFile(
      new URL("../examples/chat/pages/register.md", import.meta.url),
      "utf8",
    );
    const chatPageSource = await readFile(
      new URL("../examples/chat/pages/chat.md", import.meta.url),
      "utf8",
    );
    const actionsSource = await readFile(
      new URL("../examples/chat/server/actions.ts", import.meta.url),
      "utf8",
    );
    const serverSource = await readFile(
      new URL("../examples/chat/server.ts", import.meta.url),
      "utf8",
    );
    const clientSource = await readFile(
      new URL("../examples/chat/client/main.ts", import.meta.url),
      "utf8",
    );

    expect(loginPageSource).toContain("<!-- mdsn:block auth -->");
    expect(loginPageSource).toContain('POST "/login" (email, password) -> login');
    expect(loginPageSource).toContain("<!-- mdsn:block auth-nav -->");
    expect(loginPageSource).toContain('GET "/register" -> go_register');
    expect(registerPageSource).toContain("<!-- mdsn:block auth -->");
    expect(registerPageSource).toContain('POST "/register" (username, email, password) -> register');
    expect(registerPageSource).toContain("<!-- mdsn:block auth-nav -->");
    expect(registerPageSource).toContain('GET "/" -> go_login');
    expect(chatPageSource).toContain("<!-- mdsn:block chat -->");
    expect(chatPageSource).toContain("<!-- mdsn:block session -->");
    expect(chatPageSource).toContain('POST "/send" (message) -> send');
    expect(chatPageSource).toContain('GET "/list" -> messages');
    expect(chatPageSource).toContain('GET "/load-more" -> more');
    expect(chatPageSource).toContain('POST "/logout" () -> logout');
    expect(actionsSource).toContain("defineActions");
    expect(actionsSource).toContain("login:");
    expect(actionsSource).toContain("register:");
    expect(actionsSource).toContain("list:");
    expect(actionsSource).toContain("send:");
    expect(serverSource).toContain("align-content: end");
    expect(serverSource).toContain(".vc-chat-stream-inner");
    expect(serverSource).toContain("overflow-y: scroll");
    expect(serverSource).toContain("/stream");
    expect(serverSource).toContain("align-items: flex-start");
    expect(serverSource).toContain("/session");
    expect(serverSource).toContain("/web/chat");
    expect(clientSource).toContain("/page.md?route=");
    expect(clientSource).toContain("EventSource");
    expect(clientSource).toContain('"/web/register"');
    expect(clientSource).toContain('"/web/chat"');
  });

  it("continues from login to the chat page and completes the chat flow", async () => {
    await withServer(async (baseUrl) => {
      const loginPageResponse = await fetch(`${baseUrl}/page.md?route=/`, {
        headers: { Accept: "text/markdown" },
      });
      expect(loginPageResponse.status).toBe(200);
      const loginPageMarkdown = await loginPageResponse.text();
      expect(loginPageMarkdown).toContain("# Chat Login");
      expect(loginPageMarkdown).toContain('POST "/login" (email, password) -> login');
      expect(loginPageMarkdown).toContain('GET "/register" -> go_register');

      const registerPageResponse = await fetch(`${baseUrl}/page.md?route=/register`, {
        headers: { Accept: "text/markdown" },
      });
      expect(registerPageResponse.status).toBe(200);
      const registerPageMarkdown = await registerPageResponse.text();
      expect(registerPageMarkdown).toContain("# Register");
      expect(registerPageMarkdown).toContain('POST "/register" (username, email, password) -> register');
      expect(registerPageMarkdown).toContain('GET "/" -> go_login');

      const shellResponse = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/html" },
      });
      expect(shellResponse.status).toBe(200);
      expect(shellResponse.headers.get("content-type")).toContain("text/markdown");
      await expect(shellResponse.text()).resolves.toContain("# Chat Login");

      const negotiatedLoginPage = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/markdown" },
      });
      expect(negotiatedLoginPage.status).toBe(200);
      expect(negotiatedLoginPage.headers.get("content-type")).toContain("text/markdown");
      await expect(negotiatedLoginPage.text()).resolves.toContain("# Chat Login");

      const wildcardLoginPage = await fetch(`${baseUrl}/`, {
        headers: { Accept: "*/*" },
      });
      expect(wildcardLoginPage.status).toBe(200);
      expect(wildcardLoginPage.headers.get("content-type")).toContain("text/markdown");
      await expect(wildcardLoginPage.text()).resolves.toContain("# Chat Login");

      const webLoginShell = await fetch(`${baseUrl}/web`, {
        headers: { Accept: "text/html" },
      });
      expect(webLoginShell.status).toBe(200);
      expect(webLoginShell.headers.get("content-type")).toContain("text/html");
      await expect(webLoginShell.text()).resolves.toContain('<div id="vue-chat-root"></div>');

      const webRegisterShell = await fetch(`${baseUrl}/web/register`, {
        headers: { Accept: "text/html" },
      });
      expect(webRegisterShell.status).toBe(200);
      expect(webRegisterShell.headers.get("content-type")).toContain("text/html");
      await expect(webRegisterShell.text()).resolves.toContain('<script type="module" src="/app.js"></script>');

      const webChatShell = await fetch(`${baseUrl}/web/chat`, {
        headers: { Accept: "text/html" },
      });
      expect(webChatShell.status).toBe(200);
      expect(webChatShell.headers.get("content-type")).toContain("text/html");
      await expect(webChatShell.text()).resolves.toContain("<title>Vue Chat</title>");

      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "AgentAlpha",
            email: "alpha@example.com",
            password: "secret",
          }),
      });
      expect(registerResponse.status).toBe(200);
      const loginCookie = registerResponse.headers.get("set-cookie");
      expect(loginCookie).toContain("mdsn-chat-session=");
      expect(registerResponse.headers.get("content-type")).toContain("text/markdown");
      const registerResponseFragment = await registerResponse.text();
      expect(registerResponseFragment).toContain("## Registration Status");
      expect(registerResponseFragment).toContain('GET "/chat" -> enter_chat');

      const logoutLoginResponse = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            email: "alpha@example.com",
            password: "secret",
          }),
      });
      expect(logoutLoginResponse.status).toBe(200);
      expect(logoutLoginResponse.headers.get("content-type")).toContain("text/markdown");
      const loginResponseFragment = await logoutLoginResponse.text();
      expect(loginResponseFragment).toContain("## Login Status");
      expect(loginResponseFragment).toContain('GET "/chat" -> enter_chat');

      const chatPageResponse = await fetch(`${baseUrl}/page.md?route=/chat`, {
        headers: {
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
      });
      expect(chatPageResponse.status).toBe(200);
      const chatPageMarkdown = await chatPageResponse.text();
      expect(chatPageMarkdown).toContain("# Chat Demo");
      expect(chatPageMarkdown).toContain('GET "/list" -> messages');
      expect(chatPageMarkdown).toContain('GET "/load-more" -> more');
      expect(chatPageMarkdown).toContain('POST "/send" (message) -> send');
      expect(chatPageMarkdown).toContain('POST "/logout" () -> logout');

      const negotiatedChatPage = await fetch(`${baseUrl}/chat`, {
        headers: {
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
      });
      expect(negotiatedChatPage.status).toBe(200);
      expect(negotiatedChatPage.headers.get("content-type")).toContain("text/markdown");
      await expect(negotiatedChatPage.text()).resolves.toContain("# Chat Demo");

      const sessionResponse = await fetch(`${baseUrl}/session`, {
        headers: {
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
      });
      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.headers.get("content-type")).toContain("text/markdown");
      const sessionFragment = await sessionResponse.text();
      expect(sessionFragment).toContain("## Session Status");
      expect(sessionFragment).toContain('GET "/chat" -> enter_chat');

      const firstSend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
        body: toMarkdownInputs({
            message: "第一条：我先开场",
          }),
      });
      expect(firstSend.status).toBe(200);
      const firstFragment = await firstSend.text();
      expect(firstFragment).toContain("AgentAlpha");
      expect(firstFragment).toContain("第一条：我先开场");
      expect(firstFragment).toContain("block chat");

      const secondLoginResponse = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            email: "beta@example.com",
            password: "secret",
          }),
      });
      expect(secondLoginResponse.status).toBe(200);
      const secondLoginFragment = await secondLoginResponse.text();
      expect(secondLoginFragment).toContain("Login failed: no account matches this email and password.");
      expect(secondLoginFragment).toContain("Next step: enter the correct password and submit again, or go to register if no account exists.");
      expect(secondLoginFragment).toContain("block auth");
      const registerBeta = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "AgentBeta",
            email: "beta@example.com",
            password: "secret",
          }),
      });
      expect(registerBeta.status).toBe(200);
      const secondCookie = registerBeta.headers.get("set-cookie");
      expect(secondCookie).toContain("mdsn-chat-session=");

      const secondSend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: secondCookie ?? "",
        },
        body: toMarkdownInputs({
            message: "第二条：我接着回复",
          }),
      });
      expect(secondSend.status).toBe(200);
      const secondFragment = await secondSend.text();
      expect(secondFragment).toContain("AgentAlpha");
      expect(secondFragment).toContain("第二条：我接着回复");
      expect(secondFragment).toContain("AgentBeta");

      const refresh = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: secondCookie ?? "",
        },
      });
      expect(refresh.status).toBe(200);
      const refreshFragment = await refresh.text();
      expect(refreshFragment).toContain("AgentAlpha");
      expect(refreshFragment).toContain("AgentBeta");
      expect(refreshFragment).toContain("block chat");
      expect(refreshFragment).toContain("This view shows up to the most recent 50 messages.");
      expect(refreshFragment).toContain("Use `more` to read older messages.");

      const logoutResponse = await fetch(`${baseUrl}/logout`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
        body: "",
      });
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.headers.get("set-cookie")).toContain("mdsn-chat-session=;");
      expect(logoutResponse.headers.get("content-type")).toContain("text/markdown");
      const logoutResponseFragment = await logoutResponse.text();
      expect(logoutResponseFragment).toContain("## Logout Status");
      expect(logoutResponseFragment).toContain('GET "/" -> go_login');

      const postLogoutSession = await fetch(`${baseUrl}/session`, {
        headers: {
          Accept: "text/markdown",
          Cookie: loginCookie ?? "",
        },
      });
      expect(postLogoutSession.status).toBe(401);
    });
  });

  it("accepts markdown action payloads for register and send", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: [
          "username: MarkdownAgent",
          "email: markdown-agent@example.com",
          "password: secret",
        ].join("\n"),
      });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.headers.get("content-type")).toContain("text/markdown");
      const sessionCookie = registerResponse.headers.get("set-cookie") ?? "";
      expect(sessionCookie).toContain("mdsn-chat-session=");
      const registerFragment = await registerResponse.text();
      expect(registerFragment).toContain("## Registration Status");
      expect(registerFragment).toContain('GET "/chat" -> enter_chat');

      const sendResponse = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: sessionCookie,
        },
        body: "message: Hello from markdown payload",
      });

      expect(sendResponse.status).toBe(200);
      const sendFragment = await sendResponse.text();
      expect(sendFragment).toContain("MarkdownAgent");
      expect(sendFragment).toContain("Hello from markdown payload");
      expect(sendFragment).toContain("block chat");
    });
  });

  it("returns markdown-first guidance for auth actions when Accept is markdown-only", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: [
          "username: PromptAgent",
          "email: prompt-agent@example.com",
          "password: secret",
        ].join("\n"),
      });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.headers.get("content-type")).toContain("text/markdown");
      expect(registerResponse.headers.get("set-cookie")).toContain("mdsn-chat-session=");
      const registerFragment = await registerResponse.text();
      expect(registerFragment).toContain("## Registration Status");
      expect(registerFragment).toContain("Registration succeeded. You are now signed in.");
      expect(registerFragment).toContain('GET "/chat" -> enter_chat');
      expect(registerFragment).toContain("block next");

      const cookie = registerResponse.headers.get("set-cookie") ?? "";
      const logoutResponse = await fetch(`${baseUrl}/logout`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: "",
      });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.headers.get("content-type")).toContain("text/markdown");
      const logoutFragment = await logoutResponse.text();
      expect(logoutFragment).toContain("## Logout Status");
      expect(logoutFragment).toContain("Logout succeeded. The current session has been cleared.");
      expect(logoutFragment).toContain('GET "/" -> go_login');
      expect(logoutFragment).toContain("block next");

      const unauthorizedSend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: "message: should fail without session",
      });

      expect(unauthorizedSend.status).toBe(401);
      expect(unauthorizedSend.headers.get("content-type")).toContain("text/markdown");
      const unauthorizedFragment = await unauthorizedSend.text();
      expect(unauthorizedFragment).toContain("Please log in before sending messages.");
      expect(unauthorizedFragment).toContain('POST "/login" (email, password) -> login');
      expect(unauthorizedFragment).toContain("block auth");
    });
  });

  it("defaults wildcard Accept to markdown fragments for agent-facing actions", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "*/*",
        },
        body: [
          "username: WildcardAgent",
          "email: wildcard-agent@example.com",
          "password: secret",
        ].join("\n"),
      });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.headers.get("content-type")).toContain("text/markdown");
      const registerFragment = await registerResponse.text();
      expect(registerFragment).toContain("## Registration Status");
      expect(registerFragment).toContain('GET "/chat" -> enter_chat');
      const cookie = registerResponse.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("mdsn-chat-session=");

      const unauthorizedSend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "*/*",
        },
        body: "message: wildcard without session should fail",
      });

      expect(unauthorizedSend.status).toBe(401);
      expect(unauthorizedSend.headers.get("content-type")).toContain("text/markdown");
      const unauthorizedFragment = await unauthorizedSend.text();
      expect(unauthorizedFragment).toContain("Please log in before sending messages.");
      expect(unauthorizedFragment).toContain('POST "/login" (email, password) -> login');
    });
  });

  it("requires login before reading list and load-more", async () => {
    await withServer(async (baseUrl) => {
      const listMarkdown = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(listMarkdown.status).toBe(401);
      expect(listMarkdown.headers.get("content-type")).toContain("text/markdown");
      const listMarkdownBody = await listMarkdown.text();
      expect(listMarkdownBody).toContain("Please log in before reading room messages.");
      expect(listMarkdownBody).toContain('POST "/login" (email, password) -> login');

      const historyMarkdown = await fetch(`${baseUrl}/load-more`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(historyMarkdown.status).toBe(401);
      expect(historyMarkdown.headers.get("content-type")).toContain("text/markdown");
      const historyMarkdownBody = await historyMarkdown.text();
      expect(historyMarkdownBody).toContain("Please log in before loading older room messages.");
      expect(historyMarkdownBody).toContain('POST "/login" (email, password) -> login');

      const listJson = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
        },
      });

      expect(listJson.status).toBe(401);
      expect(listJson.headers.get("content-type")).toContain("text/markdown");
      const listJsonBody = await listJson.text();
      expect(listJsonBody).toContain("Please log in before reading room messages.");
      expect(listJsonBody).toContain('POST "/login" (email, password) -> login');
    });
  });

  it("supports multi-agent long conversation and final summary retrieval", async () => {
    await withServer(async (baseUrl) => {
      async function login(username: string, email: string) {
        const registerResponse = await fetch(`${baseUrl}/register`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
          },
          body: toMarkdownInputs({
              username,
              email,
              password: "secret",
            }),
        });

        expect(registerResponse.status).toBe(200);
        const cookie = registerResponse.headers.get("set-cookie");
        expect(cookie).toContain("mdsn-chat-session=");
        return cookie ?? "";
      }

      async function send(cookie: string, message: string) {
        const response = await fetch(`${baseUrl}/send`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
            Cookie: cookie,
          },
          body: toMarkdownInputs({ message }),
        });

        expect(response.status).toBe(200);
        return response.text();
      }

      const alphaCookie = await login("AgentAlpha", "alpha@example.com");
      const betaCookie = await login("AgentBeta", "beta@example.com");
      const gammaCookie = await login("AgentGamma", "gamma@example.com");

      await send(alphaCookie, "第一轮：先确认房间主题");
      await send(betaCookie, "第二轮：补充实现状态");
      await send(gammaCookie, "第三轮：记录当前风险");
      await send(alphaCookie, "第四轮：确认跳转链路已闭环");
      await send(betaCookie, "第五轮：确认聊天仍可继续");

      const summaryReaderCookie = await login("AgentReader", "reader@example.com");

      const refresh = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: summaryReaderCookie,
        },
      });

      expect(refresh.status).toBe(200);
      const refreshFragment = await refresh.text();
      expect(refreshFragment).toContain("AgentAlpha");
      expect(refreshFragment).toContain("AgentBeta");
      expect(refreshFragment).toContain("AgentGamma");
      expect(refreshFragment).toContain("第一轮：先确认房间主题");
      expect(refreshFragment).toContain("第五轮：确认聊天仍可继续");
      expect(refreshFragment).toContain('POST "/send" (message) -> send');
      expect(refreshFragment).not.toContain('INPUT text required -> agent');
    });
  });

  it("lets a fresh agent complete the markdown-first end-to-end loop", async () => {
    await withServer(async (baseUrl) => {
      const loginPage = await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/markdown" },
      });
      expect(loginPage.status).toBe(200);
      expect(loginPage.headers.get("content-type")).toContain("text/markdown");
      const loginSource = await loginPage.text();
      expect(loginSource).toContain("block auth");
      expect(loginSource).toContain('POST "/login" (email, password) -> login');
      expect(loginSource).toContain('GET "/register" -> go_register');

      const registerPage = await fetch(`${baseUrl}/register`, {
        headers: { Accept: "text/markdown" },
      });
      expect(registerPage.status).toBe(200);
      expect(registerPage.headers.get("content-type")).toContain("text/markdown");
      const registerSource = await registerPage.text();
      expect(registerSource).toContain("block auth");
      expect(registerSource).toContain('POST "/register" (username, email, password) -> register');
      expect(registerSource).toContain('GET "/" -> go_login');

      const register = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "AgentFresh",
            email: "fresh@example.com",
            password: "secret",
          }),
      });
      expect(register.status).toBe(200);
      expect(register.headers.get("content-type")).toContain("text/markdown");
      const cookie = register.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("mdsn-chat-session=");
      const registerFragment = await register.text();
      expect(registerFragment).toContain("## Registration Status");
      expect(registerFragment).toContain('GET "/chat" -> enter_chat');

      const chatPage = await fetch(`${baseUrl}/chat`, {
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });
      expect(chatPage.status).toBe(200);
      expect(chatPage.headers.get("content-type")).toContain("text/markdown");
      const chatSource = await chatPage.text();
      expect(chatSource).toContain("block session");
      expect(chatSource).toContain("block chat");
      expect(chatSource).toContain('POST "/logout" () -> logout');
      expect(chatSource).toContain('POST "/send" (message) -> send');
      expect(chatSource).toContain('GET "/list" -> messages');

      const send = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: toMarkdownInputs({
            message: "AgentFresh says hello",
          }),
      });
      expect(send.status).toBe(200);
      const sendFragment = await send.text();
      expect(sendFragment).toContain("AgentFresh");
      expect(sendFragment).toContain("AgentFresh says hello");
      expect(sendFragment).toContain("block chat");

      const list = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });
      expect(list.status).toBe(200);
      const listFragment = await list.text();
      expect(listFragment).toContain("AgentFresh");
      expect(listFragment).toContain("AgentFresh says hello");
      expect(listFragment).toContain("block chat");

      const logout = await fetch(`${baseUrl}/logout`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: "",
      });
      expect(logout.status).toBe(200);
      expect(logout.headers.get("set-cookie")).toContain("mdsn-chat-session=;");
      expect(logout.headers.get("content-type")).toContain("text/markdown");
      const logoutFragment = await logout.text();
      expect(logoutFragment).toContain("## Logout Status");
      expect(logoutFragment).toContain('GET "/" -> go_login');
    });
  });

  it("keeps markdown-only blackbox flow recoverable after send failures", async () => {
    await withServer(async (baseUrl) => {
      const register = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: [
          "username: MarkdownBlackbox",
          "email: markdown-blackbox@example.com",
          "password: secret",
        ].join("\n"),
      });

      expect(register.status).toBe(200);
      expect(register.headers.get("content-type")).toContain("text/markdown");
      const cookie = register.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("mdsn-chat-session=");
      const registerFragment = await register.text();
      expect(registerFragment).toContain("Registration succeeded. You are now signed in.");
      expect(registerFragment).toContain('GET "/chat" -> enter_chat');

      const emptySend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: "message: \"\"",
      });

      expect(emptySend.status).toBe(200);
      expect(emptySend.headers.get("content-type")).toContain("text/markdown");
      const emptySendFragment = await emptySend.text();
      expect(emptySendFragment).toContain("Send failed: a message is required before this chat action can continue.");
      expect(emptySendFragment).toContain("Next step: enter a message and submit again.");
      expect(emptySendFragment).toContain("block chat");

      const recoveredSend = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: "message: Markdown-only recovery works",
      });

      expect(recoveredSend.status).toBe(200);
      expect(recoveredSend.headers.get("content-type")).toContain("text/markdown");
      const recoveredSendFragment = await recoveredSend.text();
      expect(recoveredSendFragment).toContain("MarkdownBlackbox");
      expect(recoveredSendFragment).toContain("Markdown\\-only recovery works");
      expect(recoveredSendFragment).toContain("block chat");

      const list = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });

      expect(list.status).toBe(200);
      expect(list.headers.get("content-type")).toContain("text/markdown");
      const listFragment = await list.text();
      expect(listFragment).toContain("MarkdownBlackbox");
      expect(listFragment).toContain("Markdown\\-only recovery works");

      const logout = await fetch(`${baseUrl}/logout`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: "",
      });

      expect(logout.status).toBe(200);
      expect(logout.headers.get("content-type")).toContain("text/markdown");
      const logoutFragment = await logout.text();
      expect(logoutFragment).toContain("Logout succeeded. The current session has been cleared.");
      expect(logoutFragment).toContain('GET "/" -> go_login');
    });
  });

  it("lets the client and the agent explicitly load older history", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "HistoryAgent",
            email: "history@example.com",
            password: "secret",
          }),
      });
      const cookie = registerResponse.headers.get("set-cookie") ?? "";

      for (let index = 1; index <= 60; index += 1) {
        const sendResponse = await fetch(`${baseUrl}/send`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
            Cookie: cookie,
          },
          body: toMarkdownInputs({
              message: `message-${index}`,
            }),
        });
        expect(sendResponse.status).toBe(200);
      }

      const recentResponse = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });
      expect(recentResponse.status).toBe(200);
      const recentFragment = await recentResponse.text();
      expect(recentFragment).toContain("This view shows up to the most recent 50 messages.");
      expect(recentFragment).toContain("Use `more` to read older messages.");
      expect(recentFragment).toContain("message\\-60");
      expect(recentFragment).not.toContain("message\\-10");

      const historyResponse = await fetch(`${baseUrl}/load-more`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });
      expect(historyResponse.status).toBe(200);
      const historyFragment = await historyResponse.text();
      expect(historyFragment).toContain("This view includes older messages for deeper context.");
      expect(historyFragment).toContain("message\\-60");
      expect(historyFragment).toContain("message\\-10");
      expect(historyFragment).not.toContain('GET "/load-more" -> more');
    });
  });

  it("keeps markdown-heavy messages parseable in the chat fragment", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "MarkdownParser",
            email: "markdown-parser@example.com",
            password: "secret",
          }),
      });
      const cookie = registerResponse.headers.get("set-cookie") ?? "";

      const messages = [
        "plain text",
        "line1\nline2\n- bullet",
        "```json\n{\"ok\":true}\n```",
        "# heading\ntext with [link](x)",
      ];

      for (const message of messages) {
        const sendResponse = await fetch(`${baseUrl}/send`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
            Cookie: cookie,
          },
          body: toMarkdownInputs({
              message,
            }),
        });
        expect(sendResponse.status).toBe(200);
      }

      const listResponse = await fetch(`${baseUrl}/list`, {
        method: "GET",
        headers: {
          Accept: "text/markdown",
          Cookie: cookie,
        },
      });
      expect(listResponse.status).toBe(200);
      const listFragment = await listResponse.text();
      const parsed = parseFragment(listFragment);
      const parsedMessages = extractChatMessages(parsed);
      const renderedBodies = parsedMessages.map((entry) => entry.message);

      expect(parsedMessages).toHaveLength(messages.length);
      expect(renderedBodies).toEqual(expect.arrayContaining([
        "plain text",
        "line1 \\n line2 \\n - bullet",
        "```json \\n {\"ok\":true} \\n ```",
        "# heading \\n text with [link](x)",
      ]));
      expect(listFragment).toContain("\\# heading");
      expect(listFragment).toContain("\\[link\\]\\(x\\)");
    });
  });

  it("returns a chat fragment with explicit guidance when send fails", async () => {
    await withServer(async (baseUrl) => {
      const registerResponse = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
        },
        body: toMarkdownInputs({
            username: "RetryAgent",
            email: "retry@example.com",
            password: "secret",
          }),
      });
      const cookie = registerResponse.headers.get("set-cookie") ?? "";

      const sendResponse = await fetch(`${baseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "text/markdown",
          Accept: "text/markdown",
          Cookie: cookie,
        },
        body: toMarkdownInputs({
            message: "   ",
          }),
      });

      expect(sendResponse.status).toBe(200);
      const failureFragment = await sendResponse.text();
      expect(failureFragment).toContain("Send failed: a message is required before this chat action can continue.");
      expect(failureFragment).toContain("Next step: enter a message and submit again.");
      expect(failureFragment).toContain("This view shows up to the most recent 50 messages.");
      expect(failureFragment).toContain('POST "/send" (message) -> send');
      expect(failureFragment).toContain("block chat");
    });
  });

  it("pushes a refresh event over the stream endpoint after new messages", async () => {
    await withServer(async (baseUrl) => {
      const controller = new AbortController();
      const streamResponse = await fetch(`${baseUrl}/stream`, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });

      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get("content-type")).toContain("text/event-stream");

      const reader = streamResponse.body?.getReader();
      expect(reader).toBeDefined();

      try {
        const registerResponse = await fetch(`${baseUrl}/register`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
          },
          body: toMarkdownInputs({
              username: "AgentStream",
              email: "stream@example.com",
              password: "secret",
            }),
        });
        const streamCookie = registerResponse.headers.get("set-cookie");

        await fetch(`${baseUrl}/send`, {
          method: "POST",
          headers: {
            "content-type": "text/markdown",
            Accept: "text/markdown",
            Cookie: streamCookie ?? "",
          },
          body: toMarkdownInputs({
              message: "实时刷新测试",
            }),
        });

        let text = "";
        for (let attempt = 0; attempt < 3 && !text.includes("event: refresh"); attempt += 1) {
          const chunk = await reader!.read();
          text += new TextDecoder().decode(chunk.value ?? new Uint8Array());
        }

        expect(text).toContain("event: refresh");
      } finally {
        await reader!.cancel().catch(() => undefined);
        controller.abort();
      }
    });
  });
});
