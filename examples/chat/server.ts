import express from "express";
import type { Response } from "express";
import { build } from "esbuild";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseActionInputs, type ActionContext } from "@mdsnai/sdk/server";
import {
  createChatActions,
  renderChatFailureFragment,
  renderLoginFailureFragment,
  renderRedirectFragment,
  renderRegisterFailureFragment,
} from "./server/actions";
import { createChatStorage } from "./server/storage";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const loginPagePath = path.join(rootDir, "pages", "index.md");
const registerPagePath = path.join(rootDir, "pages", "register.md");
const chatPagePath = path.join(rootDir, "pages", "chat.md");
const clientEntry = path.join(rootDir, "client", "main.ts");
const SESSION_COOKIE = "mdsn-chat-session";
const defaultDbPath = path.join(rootDir, ".data", "chat.sqlite");

async function buildClientBundle(): Promise<string> {
  const result = await build({
    entryPoints: [clientEntry],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    target: "es2022",
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
    },
  });

  const output = result.outputFiles[0];
  if (!output) {
    throw new Error("Missing bundled client output");
  }

  return output.text;
}

function renderShell(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vue Chat</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: "Helvetica Neue", "PingFang SC", sans-serif; background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%); color: #111827; }
      .vc-shell { max-width: 980px; margin: 0 auto; padding: 36px 20px 56px; }
      .vc-hero { margin-bottom: 20px; }
      .vc-hero h1 { margin: 0 0 16px; font-size: 46px; line-height: 1; letter-spacing: -0.03em; }
      .vc-hero p, .vc-hero li { font-size: 17px; line-height: 1.7; color: #4b5563; }
      .vc-hero ul { padding-left: 22px; margin: 0; }
      .vc-chat-window { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 28px; box-shadow: 0 24px 64px rgba(15, 23, 42, 0.10); overflow: hidden; }
      .vc-chat-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 22px; border-bottom: 1px solid #e5e7eb; background: rgba(255,255,255,0.86); backdrop-filter: blur(12px); }
      .vc-chat-title { font-size: 20px; font-weight: 700; }
      .vc-agent-chip { padding: 8px 12px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 14px; font-weight: 700; }
      .vc-auth-card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 28px; padding: 28px; box-shadow: 0 24px 64px rgba(15, 23, 42, 0.10); }
      .vc-auth-card-header { display: grid; gap: 8px; margin-bottom: 18px; }
      .vc-auth-copy { margin: 0; color: #4b5563; line-height: 1.7; }
      .vc-auth-form { display: grid; gap: 14px; }
      .vc-auth-nav { display: flex; justify-content: center; margin-top: 16px; }
      .vc-auth-nav-button { border: 0; border-radius: 999px; padding: 11px 16px; font: inherit; font-weight: 700; cursor: pointer; background: #eef2f7; color: #111827; }
      .vc-field { display: grid; gap: 8px; }
      .vc-field-label { font-size: 14px; font-weight: 700; color: #111827; }
      .vc-field-input { width: 100%; border: 1px solid #cdd6e1; border-radius: 16px; padding: 14px 16px; font: inherit; box-sizing: border-box; background: #ffffff; }
      .vc-chat-stream { display: block; height: clamp(320px, 56vh, 640px); overflow-x: hidden; overflow-y: scroll; overscroll-behavior: contain; scrollbar-gutter: stable both-edges; scrollbar-width: thin; padding: 22px; background:
        radial-gradient(circle at top left, rgba(99, 102, 241, 0.10), transparent 32%),
        radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.08), transparent 28%),
        #f8fafc; }
      .vc-chat-stream::-webkit-scrollbar { width: 10px; }
      .vc-chat-stream::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.28); border-radius: 999px; }
      .vc-chat-stream::-webkit-scrollbar-track { background: transparent; }
      .vc-chat-stream-inner { display: grid; gap: 14px; min-height: 100%; align-content: end; }
      .vc-message-row { display: flex; align-items: flex-start; }
      .vc-message-row.is-self { justify-content: flex-end; }
      .vc-message-row.is-other { justify-content: flex-start; }
      .vc-message-bubble { width: fit-content; max-width: min(78%, 560px); border-radius: 20px; padding: 14px 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }
      .vc-message-bubble.is-self { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; border-bottom-right-radius: 8px; }
      .vc-message-bubble.is-other { background: #ffffff; color: #111827; border: 1px solid #dbe2ea; border-bottom-left-radius: 8px; }
      .vc-message-meta { font-size: 12px; font-weight: 700; opacity: 0.72; margin-bottom: 6px; }
      .vc-message-body { font-size: 15px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      .vc-empty-state { padding: 48px 24px; text-align: center; color: #6b7280; font-size: 16px; }
      .vc-composer { display: grid; gap: 12px; padding: 18px 22px 22px; border-top: 1px solid #e5e7eb; background: #ffffff; }
      .vc-composer-input { width: 100%; min-height: 92px; border: 1px solid #cdd6e1; border-radius: 18px; padding: 14px 16px; font: inherit; box-sizing: border-box; resize: vertical; background: #ffffff; }
      .vc-composer-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .vc-primary-button, .vc-secondary-button { border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 700; cursor: pointer; }
      .vc-primary-button { background: #111827; color: #ffffff; }
      .vc-secondary-button { background: #eef2f7; color: #111827; }
      .vc-primary-button:disabled, .vc-secondary-button:disabled { opacity: 0.55; cursor: not-allowed; }
      .vc-error { margin: 0; color: #b42318; font-weight: 600; }
      .vc-loading { font-size: 17px; color: #6b7280; }
      @media (max-width: 720px) {
        .vc-shell { padding: 24px 12px 36px; }
        .vc-hero h1 { font-size: 36px; }
        .vc-chat-stream { height: min(58vh, 460px); padding: 16px; }
        .vc-chat-header, .vc-composer { padding-left: 16px; padding-right: 16px; }
        .vc-message-bubble { max-width: 88%; }
      }
    </style>
  </head>
  <body>
    <div id="vue-chat-root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;
}

function createActionContext(
  pathname: string,
  inputs: Record<string, unknown>,
  request: unknown,
  cookies: Record<string, string> = {},
): ActionContext {
  return {
    inputs,
    params: {},
    query: new URLSearchParams(),
    pathname,
    request,
    cookies,
    env: {},
    site: {},
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) {
        return [part, ""] as const;
      }
      return [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))] as const;
    }));
}

function summarizeSessionForLog(cookieHeader: string | undefined): string {
  const sessionId = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!sessionId) {
    return "-";
  }
  return `${sessionId.slice(0, 8)}...`;
}

type ActionFailureResult = {
  ok: false;
  errorCode: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

type ActionFragmentResult = {
  ok: true;
  kind: "fragment";
  markdown: string;
};

type ActionRedirectResult = {
  ok: true;
  kind: "redirect";
  location: string;
};

function isActionFailureResult(value: unknown): value is ActionFailureResult {
  return !!value && typeof value === "object" && (value as { ok?: unknown }).ok === false;
}

function isActionFragmentResult(value: unknown): value is ActionFragmentResult {
  return !!value
    && typeof value === "object"
    && (value as { ok?: unknown }).ok === true
    && (value as { kind?: unknown }).kind === "fragment"
    && typeof (value as { markdown?: unknown }).markdown === "string";
}

function isActionRedirectResult(value: unknown): value is ActionRedirectResult {
  return !!value
    && typeof value === "object"
    && (value as { ok?: unknown }).ok === true
    && (value as { kind?: unknown }).kind === "redirect"
    && typeof (value as { location?: unknown }).location === "string";
}

export async function startVueChatDemo(
  options: { host?: string; port?: number; dbPath?: string } = {},
): Promise<Server> {
  const clientBundle = await buildClientBundle();
  const loginPageMarkdown = await readFile(loginPagePath, "utf8");
  const registerPageMarkdown = await readFile(registerPagePath, "utf8");
  const chatPageMarkdown = await readFile(chatPagePath, "utf8");
  const app = express();
  const streamClients = new Set<Response>();
  const storage = createChatStorage(options.dbPath ?? defaultDbPath);
  const actions = createChatActions(storage);

  app.use((req, res, next) => {
    const startedAt = Date.now();
    const sessionSummary = summarizeSessionForLog(req.headers.cookie);
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[chat] ${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs}ms sid=${sessionSummary}`,
      );
    });
    next();
  });

  app.use(express.json());
  app.use(express.text({
    type: ["text/markdown", "text/plain"],
    limit: "1mb",
  }));
  app.use(express.urlencoded({ extended: true }));

  app.get(["/", "/register", "/chat"], (req, res) => {
    res.setHeader("cache-control", "no-store");
    const pageMarkdown = req.path === "/chat"
      ? chatPageMarkdown
      : req.path === "/register"
        ? registerPageMarkdown
        : loginPageMarkdown;
    res.status(200).type("text/markdown; charset=utf-8").send(pageMarkdown);
  });

  app.get("/app.js", (_req, res) => {
    res.setHeader("cache-control", "no-store");
    res.status(200).type("application/javascript; charset=utf-8").send(clientBundle);
  });

  app.get("/page.md", (req, res) => {
    res.setHeader("cache-control", "no-store");
    const route = typeof req.query.route === "string" ? req.query.route : "/";
    const pageMarkdown = route === "/chat"
      ? chatPageMarkdown
      : route === "/register"
        ? registerPageMarkdown
        : loginPageMarkdown;
    res.status(200).type("text/markdown; charset=utf-8").send(pageMarkdown);
  });

  app.get("/session", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];
    const session = sessionId ? storage.getSession(sessionId) : null;
    if (!session) {
      res.status(401).type("text/markdown; charset=utf-8").send(
        renderLoginFailureFragment(
          "Login required: sign in to continue this session.",
        ),
      );
      return;
    }

    res.status(200).type("text/markdown; charset=utf-8").send(
      renderRedirectFragment(
        "/chat",
        "## Session Status",
        `Session active for **${session.user.username}** (${session.user.email}).`,
      ),
    );
  });

  app.get("/stream", (req, res) => {
    res.status(200);
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    res.flushHeaders?.();
    res.write(": connected\n\n");
    streamClients.add(res);

    req.on("close", () => {
      streamClients.delete(res);
      res.end();
    });
  });

  app.post("/list", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];
    const session = sessionId ? storage.getSession(sessionId) : null;
    if (!session) {
      res.status(401).type("text/markdown; charset=utf-8").send(
        renderLoginFailureFragment(
          "Please log in before reading room messages.",
        ),
      );
      return;
    }
    const markdown = await actions.list.run(createActionContext("/list", {}, req, parseCookies(req.headers.cookie)));
    res.status(200).type("text/markdown; charset=utf-8").send(markdown);
  });

  app.post("/load-more", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];
    const session = sessionId ? storage.getSession(sessionId) : null;
    if (!session) {
      res.status(401).type("text/markdown; charset=utf-8").send(
        renderLoginFailureFragment(
          "Please log in before loading older room messages.",
        ),
      );
      return;
    }
    const markdown = await actions.history.run(createActionContext("/load-more", {}, req, parseCookies(req.headers.cookie)));
    res.status(200).type("text/markdown; charset=utf-8").send(markdown);
  });

  app.post("/register", async (req, res) => {
    const inputs = parseActionInputs(req.body);
    const result = await actions.register.run(
      createActionContext("/register", inputs, req, parseCookies(req.headers.cookie)),
    );

    if (typeof result === "string") {
      res.status(400).type("text/markdown; charset=utf-8").send(result);
      return;
    }

    if (isActionFragmentResult(result)) {
      res.status(400).type("text/markdown; charset=utf-8").send(result.markdown);
      return;
    }

    if (isActionRedirectResult(result)) {
      const user = storage.authenticateUser({
        email: String(inputs.email ?? "").trim().toLowerCase(),
        password: String(inputs.password ?? ""),
      });
      if (!user) {
        res.status(500).type("text/markdown; charset=utf-8").send(
          renderRegisterFailureFragment(
            "Registration succeeded but session setup failed. Please log in with the same credentials.",
          ),
        );
        return;
      }
      const session = storage.createSession(user.id);
      res.cookie(SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      res.status(200).type("text/markdown; charset=utf-8").send(
        renderRedirectFragment(
          "/chat",
          "## Registration Status",
          "Registration succeeded. You are now signed in.",
        ),
      );
      return;
    }

    if (isActionFailureResult(result)) {
      res.status(400).type("text/markdown; charset=utf-8").send(
        renderRegisterFailureFragment(
          result.message ?? "Registration failed: please review your inputs and try again.",
        ),
      );
      return;
    }

    res.status(500).type("text/markdown; charset=utf-8").send(
      renderRegisterFailureFragment(
        "Registration failed: invalid server result.",
      ),
    );
  });

  app.post("/login", async (req, res) => {
    const inputs = parseActionInputs(req.body);
    const result = await actions.login.run(
      createActionContext("/login", inputs, req, parseCookies(req.headers.cookie)),
    );

    if (typeof result === "string") {
      res.status(400).type("text/markdown; charset=utf-8").send(result);
      return;
    }

    if (isActionFragmentResult(result)) {
      res.status(400).type("text/markdown; charset=utf-8").send(result.markdown);
      return;
    }

    if (isActionRedirectResult(result)) {
      const user = storage.authenticateUser({
        email: String(inputs.email ?? "").trim().toLowerCase(),
        password: String(inputs.password ?? ""),
      });
      if (!user) {
        res.status(401).type("text/markdown; charset=utf-8").send(
          renderLoginFailureFragment(
            "Login failed: no matching account was found for this email and password.",
          ),
        );
        return;
      }
      const session = storage.createSession(user.id);
      res.cookie(SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      res.status(200).type("text/markdown; charset=utf-8").send(
        renderRedirectFragment(
          "/chat",
          "## Login Status",
          "Login succeeded. Welcome back to the shared chat.",
        ),
      );
      return;
    }

    if (isActionFailureResult(result)) {
      res.status(400).type("text/markdown; charset=utf-8").send(
        renderLoginFailureFragment(
          result.message ?? "Login failed: please review your credentials and try again.",
        ),
      );
      return;
    }

    res.status(500).type("text/markdown; charset=utf-8").send(
      renderLoginFailureFragment(
        "Login failed: invalid server result.",
      ),
    );
  });

  app.post("/logout", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];
    if (sessionId) {
      storage.deleteSession(sessionId);
    }
    const result = await actions.logout.run(
      createActionContext("/logout", {}, req, cookies),
    );
    res.cookie(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    res.status(200).type("text/markdown; charset=utf-8").send(
      renderRedirectFragment(
        "/",
        "## Logout Status",
        "Logout succeeded. The current session has been cleared.",
      ),
    );
  });

  app.post("/send", async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];
    const session = sessionId ? storage.getSession(sessionId) : null;
    if (!session) {
      res.status(401).type("text/markdown; charset=utf-8").send(
        renderLoginFailureFragment(
          "Please log in before sending messages.",
        ),
      );
      return;
    }

    const inputs = {
      ...parseActionInputs(req.body),
      userId: session.user.id,
      username: session.user.username,
      email: session.user.email,
      agent: session.user.username,
    };

    const result = await actions.send.run(
      createActionContext("/send", inputs, req, cookies),
    );

    if (typeof result === "string") {
      for (const client of streamClients) {
        client.write("event: refresh\n");
        client.write("data: chat\n\n");
      }
      res.status(200).type("text/markdown; charset=utf-8").send(result);
      return;
    }

    if (isActionFragmentResult(result)) {
      for (const client of streamClients) {
        client.write("event: refresh\n");
        client.write("data: chat\n\n");
      }
      res.status(200).type("text/markdown; charset=utf-8").send(result.markdown);
      return;
    }

    if (isActionFailureResult(result)) {
      if (result.errorCode === "EMPTY_MESSAGE") {
        res.status(400).type("text/markdown; charset=utf-8").send(
          renderChatFailureFragment(
            storage,
            result.message ?? "Send failed: a message is required before this chat action can continue.",
            result.fieldErrors?.message ?? "Next step: enter a message and submit again.",
          ),
        );
        return;
      }

      res.status(400).type("text/markdown; charset=utf-8").send(
        renderChatFailureFragment(
          storage,
          result.message ?? "Send failed: unable to process this message.",
          result.fieldErrors?.message ?? "Next step: try sending again.",
        ),
      );
      return;
    }

    if (isActionRedirectResult(result)) {
      res.status(200).type("text/markdown; charset=utf-8").send(
        renderRedirectFragment(
          result.location,
          "## Chat Status",
          "Action completed and requested a redirect.",
        ),
      );
      return;
    }

    res.status(500).type("text/markdown; charset=utf-8").send(
      renderChatFailureFragment(
        storage,
        "Send failed: invalid server result.",
        "Next step: try sending again.",
      ),
    );
  });

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(options.port ?? 3000, options.host ?? "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  server.on("close", () => {
    storage.close();
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? "4024");
  startVueChatDemo({ host, port }).then(() => {
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    console.log(`Vue chat demo listening on http://${displayHost}:${port}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
