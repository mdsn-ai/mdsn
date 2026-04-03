// @vitest-environment node

import http from "node:http";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createMdsnServer, ok, stream } from "../../src/server/index.js";
import { createHost, createNodeRequestListener } from "@mdsnai/sdk/server/node";

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
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

describe("createNodeRequestListener", () => {
  it("writes event-stream responses through the Node host", async () => {
    const mdsn = createMdsnServer();

    mdsn.get("/stream", async () =>
      stream(
        (async function* () {
          yield {
            markdown: "## Tick",
            blocks: []
          };
          yield {
            markdown: "## Tock",
            blocks: []
          };
        })()
      )
    );

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    const response = await fetch(`${baseUrl}/stream`, {
      headers: {
        accept: "text/event-stream"
      }
    });

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("data: ## Tick");
    expect(body).toContain("data: ## Tock");
  });

  it("bridges Node form posts into markdown action handlers", async () => {
    const mdsn = createMdsnServer();

    mdsn.post("/post", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Saved ${ctx.inputs.message ?? ""}`,
          blocks: []
        }
      })
    );

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    const response = await fetch(`${baseUrl}/post`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ message: "Hello bridge" })
    });

    expect(response.headers.get("content-type")).toContain("text/markdown");
    await expect(response.text()).resolves.toContain("## Saved Hello bridge");
  });

  it("preserves unsupported POST media types so the runtime can return 415", async () => {
    const mdsn = createMdsnServer();

    mdsn.post("/post", async () =>
      ok({
        fragment: {
          markdown: "# Should not run",
          blocks: []
        }
      })
    );

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    const response = await fetch(`${baseUrl}/post`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: '{"message":"Hello"}'
    });

    expect(response.status).toBe(415);
    await expect(response.text()).resolves.toContain("Unsupported Media Type");
  });

  it("normalizes urlencoded form data into comma-separated markdown body", async () => {
    let seenBody = "";
    const mdsn = createMdsnServer();

    mdsn.post("/post", async (ctx) => {
      seenBody = ctx.request.body ?? "";
      return ok({
        fragment: {
          markdown: `## Saved ${ctx.inputs.message ?? ""}`,
          blocks: []
        }
      });
    });

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    await fetch(`${baseUrl}/post`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ nickname: "Guest", message: "Hello bridge" })
    });

    expect(seenBody).toBe('nickname: "Guest", message: "Hello bridge"');
  });

  it("can transform rendered html responses before writing them", async () => {
    const mdsn = createMdsnServer();

    mdsn.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blockContent: {
        guestbook: "## 1 live message\n\n- Welcome"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "refresh", inputs: [], label: "Refresh" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    const baseUrl = await listen(
      createNodeRequestListener(mdsn, {
        transformHtml(html) {
          return html.replace("</body>", "<script>window.__mdsn = true</script></body>");
        }
      })
    );
    const response = await fetch(`${baseUrl}/guestbook`, {
      headers: {
        accept: "text/html"
      }
    });

    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("window.__mdsn = true");
  });

  it("forwards incoming cookies into the neutral request for session providers", async () => {
    let seenSession: unknown = null;
    const mdsn = createMdsnServer({
      session: {
        async read(request) {
          seenSession = request.cookies.mdsn_session ?? null;
          return null;
        },
        async commit() {},
        async clear() {}
      }
    });

    mdsn.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    await fetch(`${baseUrl}/list`, {
      headers: {
        accept: "text/markdown",
        cookie: "mdsn_session=user-1; theme=light"
      }
    });

    expect(seenSession).toBe("user-1");
  });

  it("ignores malformed cookie encoding instead of failing the request", async () => {
    let seenBadCookie: string | null = null;
    const mdsn = createMdsnServer({
      session: {
        async read(request) {
          seenBadCookie = request.cookies.bad ?? null;
          return null;
        },
        async commit() {},
        async clear() {}
      }
    });

    mdsn.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const baseUrl = await listen(createNodeRequestListener(mdsn));
    const response = await fetch(`${baseUrl}/list`, {
      headers: {
        accept: "text/markdown",
        cookie: "bad=%E0%A4%A; mdsn_session=user-1"
      }
    });

    expect(response.status).toBe(200);
    expect(seenBadCookie).toBe("%E0%A4%A");
  });

  it("rejects request bodies that exceed maxBodyBytes with 413", async () => {
    let called = false;
    const mdsn = createMdsnServer();

    mdsn.post("/post", async () => {
      called = true;
      return ok({
        fragment: {
          markdown: "## Saved",
          blocks: []
        }
      });
    });

    const baseUrl = await listen(
      createNodeRequestListener(mdsn, {
        maxBodyBytes: 16
      })
    );

    const response = await fetch(`${baseUrl}/post`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `message: "${"x".repeat(100)}"`
    });

    expect(response.status).toBe(413);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    await expect(response.text()).resolves.toContain("Payload Too Large");
    expect(called).toBe(false);
  });

  it("can create a higher-level Node host with redirects and static mounts", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-node-host-"));
    const publicDir = join(tempRoot, "public");
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(tempRoot, "hello.js"), 'console.log("hello")');
    await writeFile(join(publicDir, "page.js"), 'console.log("page")');

    const mdsn = createMdsnServer();
    mdsn.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const baseUrl = await listen(
      createHost(mdsn, {
        rootRedirect: "/guestbook",
        staticFiles: {
          "/hello.js": join(tempRoot, "hello.js")
        },
        staticMounts: [
          {
            urlPrefix: "/public/",
            directory: publicDir
          }
        ]
      })
    );

    const redirect = await fetch(`${baseUrl}/`, { redirect: "manual" });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("/guestbook");

    const hello = await fetch(`${baseUrl}/hello.js`);
    expect(hello.headers.get("content-type")).toContain("text/javascript");
    await expect(hello.text()).resolves.toContain('console.log("hello")');

    const helloEtag = hello.headers.get("etag");
    expect(helloEtag).toBeTruthy();
    expect(hello.headers.get("cache-control")).toContain("public, max-age=0");

    const cachedHello = await fetch(`${baseUrl}/hello.js`, {
      headers: {
        "if-none-match": helloEtag ?? ""
      }
    });
    expect(cachedHello.status).toBe(304);
    expect(await cachedHello.text()).toBe("");

    const page = await fetch(`${baseUrl}/public/page.js`);
    expect(page.headers.get("content-type")).toContain("text/javascript");
    await expect(page.text()).resolves.toContain('console.log("page")');

    const response = await fetch(`${baseUrl}/list`, {
      headers: {
        accept: "text/markdown"
      }
    });
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("# Demo");

    const favicon = await fetch(`${baseUrl}/favicon.ico`);
    expect(favicon.status).toBe(204);
  });

  it("serves html static files with text/html content type", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-node-host-html-"));
    await writeFile(join(tempRoot, "index.html"), "<!doctype html><h1>Hello</h1>");

    const mdsn = createMdsnServer();
    const baseUrl = await listen(
      createHost(mdsn, {
        staticFiles: {
          "/index.html": join(tempRoot, "index.html")
        }
      })
    );

    const response = await fetch(`${baseUrl}/index.html`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("<h1>Hello</h1>");
  });

  it("supports a real cookie-backed session roundtrip through the Node host", async () => {
    const mdsn = createMdsnServer({
      session: {
        async read(request) {
          return request.cookies.mdsn_session ? { userId: request.cookies.mdsn_session } : null;
        },
        async commit(mutation, response) {
          if (mutation?.type === "sign-in") {
            response.headers["set-cookie"] = `mdsn_session=${mutation.session.userId}; Path=/; HttpOnly`;
          }
        },
        async clear(_session, response) {
          response.headers["set-cookie"] = "mdsn_session=; Path=/; Max-Age=0";
        }
      }
    });

    mdsn.get("/account", async (ctx) =>
      ok({
        fragment: {
          markdown: ctx.session ? `## Welcome ${(ctx.session as { userId: string }).userId}` : "## Please sign in",
          blocks: []
        }
      })
    );
    mdsn.post("/login", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Welcome ${ctx.inputs.nickname ?? "guest"}`,
          blocks: []
        },
        session: { type: "sign-in", session: { userId: ctx.inputs.nickname ?? "guest" } }
      })
    );

    const baseUrl = await listen(createHost(mdsn));
    const login = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ nickname: "Guest" })
    });

    const cookie = login.headers.get("set-cookie");
    expect(cookie).toContain("mdsn_session=Guest");

    const account = await fetch(`${baseUrl}/account`, {
      headers: {
        accept: "text/markdown",
        cookie: cookie ?? ""
      }
    });

    expect(account.status).toBe(200);
    await expect(account.text()).resolves.toContain("## Welcome Guest");
  });

  it("clears the session cookie on sign-out and returns to the signed-out state", async () => {
    const mdsn = createMdsnServer({
      session: {
        async read(request) {
          return request.cookies.mdsn_session ? { userId: request.cookies.mdsn_session } : null;
        },
        async commit(mutation, response) {
          if (mutation?.type === "sign-in") {
            response.headers["set-cookie"] = `mdsn_session=${mutation.session.userId}; Path=/; HttpOnly`;
          }
        },
        async clear(_session, response) {
          response.headers["set-cookie"] = "mdsn_session=; Path=/; Max-Age=0";
        }
      }
    });

    mdsn.get("/account", async (ctx) =>
      ok({
        fragment: {
          markdown: ctx.session ? `## Welcome ${(ctx.session as { userId: string }).userId}` : "## Please sign in",
          blocks: []
        }
      })
    );
    mdsn.post("/login", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Welcome ${ctx.inputs.nickname ?? "guest"}`,
          blocks: []
        },
        session: { type: "sign-in", session: { userId: ctx.inputs.nickname ?? "guest" } }
      })
    );
    mdsn.post("/logout", async () =>
      ok({
        fragment: {
          markdown: "## Signed out",
          blocks: []
        },
        session: { type: "sign-out" }
      })
    );

    const baseUrl = await listen(createHost(mdsn));
    const login = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ nickname: "Guest" })
    });
    const cookie = login.headers.get("set-cookie") ?? "";

    const logout = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown",
        cookie
      },
      body: ""
    });

    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");

    const account = await fetch(`${baseUrl}/account`, {
      headers: {
        accept: "text/markdown"
      }
    });

    await expect(account.text()).resolves.toContain("## Please sign in");
  });

  it("does not serve files outside a mounted static directory", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-node-host-safe-"));
    const publicDir = join(tempRoot, "public");
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(tempRoot, "secret.txt"), "secret");
    await writeFile(join(publicDir, "page.txt"), "public");

    const mdsn = createMdsnServer();
    const baseUrl = await listen(
      createHost(mdsn, {
        staticMounts: [{ urlPrefix: "/public/", directory: publicDir }]
      })
    );

    const allowed = await fetch(`${baseUrl}/public/page.txt`);
    await expect(allowed.text()).resolves.toBe("public");

    const escaped = await fetch(`${baseUrl}/public/../secret.txt`, {
      headers: { accept: "text/markdown" }
    });
    expect(escaped.status).toBe(404);
  });

  it("does not serve files for lookalike static mount prefixes", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-node-host-prefix-"));
    const publicDir = join(tempRoot, "public");
    await mkdir(join(publicDir, "-evil"), { recursive: true });
    await writeFile(join(publicDir, "-evil", "secret.txt"), "secret");

    const mdsn = createMdsnServer();
    const baseUrl = await listen(
      createHost(mdsn, {
        staticMounts: [{ urlPrefix: "/public", directory: publicDir }]
      })
    );

    const response = await fetch(`${baseUrl}/public-evil/secret.txt`, {
      headers: { accept: "text/markdown" }
    });

    expect(response.status).toBe(404);
  });

  it("serves root-mounted static files from top-level paths", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-node-host-root-"));
    await writeFile(join(tempRoot, "site.css"), "body { color: red; }");

    const mdsn = createMdsnServer();
    const baseUrl = await listen(
      createHost(mdsn, {
        staticMounts: [{ urlPrefix: "/", directory: tempRoot }]
      })
    );

    const response = await fetch(`${baseUrl}/site.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    await expect(response.text()).resolves.toContain("color: red");
  });
});
