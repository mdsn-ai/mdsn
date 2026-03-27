import express from "express";
import { build } from "esbuild";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ActionContext } from "@mdsnai/sdk/server";
import { actions, resetGuestbookMessagesForTest } from "./server/actions";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(rootDir, "pages", "index.md");
const clientEntry = path.join(rootDir, "client", "main.tsx");

async function buildClientBundle(): Promise<string> {
  const result = await build({
    entryPoints: [clientEntry],
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
    jsx: "automatic",
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
    <title>React Guestbook</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: "Helvetica Neue", "PingFang SC", sans-serif; background: #f5f0e8; color: #1e1a16; }
      .rg-shell { max-width: 1100px; margin: 0 auto; padding: 48px 24px 64px; }
      .rg-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, 420px); gap: 32px; align-items: start; }
      .rg-copy h1 { font-size: 56px; line-height: 1; margin: 0 0 24px; }
      .rg-copy p, .rg-copy li { font-size: 18px; line-height: 1.7; }
      .rg-copy ul { padding-left: 22px; }
      .rg-sidebar { position: sticky; top: 24px; }
      .rg-card { background: #fffdf8; border: 1px solid #d8cdbd; border-radius: 24px; padding: 24px; box-shadow: 0 20px 60px rgba(53, 38, 20, 0.08); }
      .rg-card h2 { margin-top: 0; font-size: 28px; }
      .rg-card ul { padding-left: 20px; }
      .rg-form { display: grid; gap: 16px; margin-top: 20px; }
      .rg-form label { display: grid; gap: 8px; font-weight: 600; }
      .rg-form input, .rg-form textarea { width: 100%; border: 1px solid #c8baa7; border-radius: 14px; padding: 12px 14px; font: inherit; background: #fff; box-sizing: border-box; }
      .rg-actions { display: flex; gap: 12px; }
      .rg-actions button { border: 0; border-radius: 999px; padding: 12px 18px; font: inherit; font-weight: 700; cursor: pointer; background: #1e1a16; color: white; }
      .rg-actions button:first-child { background: #ece2d3; color: #1e1a16; }
      .rg-error { margin: 0; color: #b42318; font-weight: 600; }
      .rg-status { margin-top: 18px; color: #6b5f52; }
      .rg-muted { color: #6b5f52; }
      @media (max-width: 900px) {
        .rg-layout { grid-template-columns: 1fr; }
        .rg-sidebar { position: static; }
        .rg-copy h1 { font-size: 44px; }
      }
    </style>
  </head>
  <body>
    <div id="react-guestbook-root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;
}

function createActionContext(
  pathname: string,
  inputs: Record<string, unknown>,
  request: unknown,
): ActionContext {
  return {
    inputs,
    params: {},
    query: new URLSearchParams(),
    pathname,
    request,
    cookies: {},
    env: {},
    site: {},
  };
}

function parseActionInputs(payload: unknown): Record<string, unknown> {
  if (typeof payload === "object" && payload && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (typeof record.inputs === "object" && record.inputs && !Array.isArray(record.inputs)) {
      return record.inputs as Record<string, unknown>;
    }
    return record;
  }

  if (typeof payload === "string") {
    const inputs: Record<string, unknown> = {};
    for (const rawLine of payload.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || line.startsWith("```")) {
        continue;
      }
      const normalized = line
        .replace(/^[-*+]\s+/u, "")
        .replace(/^\d+\.\s+/u, "")
        .replace(/^input\s+/iu, "");
      const separator = normalized.indexOf(":");
      if (separator <= 0) {
        continue;
      }
      const name = normalized.slice(0, separator).trim();
      if (!/^[a-zA-Z_][\w-]*$/u.test(name)) {
        continue;
      }
      const rawValue = normalized.slice(separator + 1).trim();
      if (!rawValue) {
        inputs[name] = "";
        continue;
      }
      try {
        inputs[name] = JSON.parse(rawValue);
      } catch {
        inputs[name] = rawValue.replace(/^["']|["']$/gu, "");
      }
    }
    return inputs;
  }

  return {};
}

export async function startReactGuestbookDemo(options: { port?: number } = {}): Promise<Server> {
  resetGuestbookMessagesForTest();
  const clientBundle = await buildClientBundle();
  const pageMarkdown = await readFile(pagePath, "utf8");
  const app = express();

  app.use(express.json());
  app.use(express.text({
    type: ["text/markdown", "text/plain"],
    limit: "1mb",
  }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.status(200).type("text/html; charset=utf-8").send(renderShell());
  });

  app.get("/app.js", (_req, res) => {
    res.status(200).type("application/javascript; charset=utf-8").send(clientBundle);
  });

  app.get("/page.md", (_req, res) => {
    res.status(200).type("text/markdown; charset=utf-8").send(pageMarkdown);
  });

  app.post("/list", async (_req, res) => {
    const markdown = await actions.list.run(createActionContext("/list", {}, _req));
    res.status(200).type("text/markdown; charset=utf-8").send(markdown);
  });

  app.post("/post", async (req, res) => {
    const result = await actions.post.run(
      createActionContext("/post", parseActionInputs(req.body), req),
    );

    if (typeof result === "string") {
      res.status(200).type("text/markdown; charset=utf-8").send(result);
      return;
    }

    res.status(400).json(result);
  });

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.listen(options.port ?? 3000, () => resolve());
    server.on("error", reject);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? "4025");
  startReactGuestbookDemo({ port }).then(() => {
    console.log(`React guestbook demo listening on http://localhost:${port}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
