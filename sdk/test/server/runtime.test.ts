import { describe, expect, it, vi } from "vitest";

import { createMdsnServer, ok, signIn, stream } from "../../src/server/index.js";

async function readBody(body: string | AsyncIterable<string>): Promise<string> {
  if (typeof body === "string") {
    return body;
  }

  let result = "";
  for await (const chunk of body) {
    result += chunk;
  }
  return result;
}

describe("createMdsnServer", () => {
  it("returns a single server-sent event when event-stream is requested for a regular fragment", async () => {
    const server = createMdsnServer();

    server.get("/updates", async () =>
      ok({
        fragment: {
          markdown: "## Updated",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/updates",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    const body = await readBody(response.body);
    expect(body).toContain("data: ## Updated");
  });

  it("streams multiple fragment updates when a handler returns an event stream", async () => {
    const server = createMdsnServer();

    server.get("/updates", async () =>
      stream(
        (async function* () {
          yield {
            markdown: "## First",
            blocks: []
          };
          yield {
            markdown: "## Second",
            blocks: []
          };
        })()
      )
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/updates",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    const body = await readBody(response.body);
    expect(body).toContain("data: ## First");
    expect(body).toContain("data: ## Second");
  });

  it("matches GET handlers by target and returns markdown", async () => {
    const server = createMdsnServer();

    server.get("/list", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Hi ${ctx.inputs.name ?? "friend"}`,
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list?name=Guest",
      headers: { accept: "text/markdown" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("## Hi Guest");
  });

  it("matches POST handlers by target, parses markdown body, and commits session", async () => {
    const commit = vi.fn(async () => undefined);
    const server = createMdsnServer({
      session: {
        read: async () => null,
        commit,
        clear: async () => undefined
      }
    });

    server.post("/login", async (ctx) =>
      ok({
        fragment: {
          markdown: `# Welcome ${ctx.inputs.nickname}`,
          blocks: []
        },
        session: signIn({ userId: "user-1" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `nickname: "Guest"`,
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("# Welcome Guest");
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("returns 415 for unsupported POST content types", async () => {
    const server = createMdsnServer();

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "# Should not run",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: `{"nickname":"Guest"}`,
      cookies: {}
    });

    expect(response.status).toBe(415);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("Unsupported Media Type");
  });

  it("passes the current session into sessionProvider.clear during sign-out", async () => {
    const clear = vi.fn(async () => undefined);
    const server = createMdsnServer({
      session: {
        read: async () => ({ sessionId: "s1", userId: "ada" }),
        commit: async () => undefined,
        clear
      }
    });

    server.post("/logout", async () =>
      ok({
        fragment: {
          markdown: "## Signed out",
          blocks: []
        },
        session: { type: "sign-out" }
      })
    );

    await server.handle({
      method: "POST",
      url: "https://example.test/logout",
      headers: {
        accept: "text/markdown"
      },
      cookies: {
        mdsn_session: "s1"
      }
    });

    expect(clear).toHaveBeenCalledWith(
      { sessionId: "s1", userId: "ada" },
      expect.objectContaining({ status: 200 }),
      expect.objectContaining({ url: "https://example.test/logout" })
    );
  });

  it("allows empty POST actions without an explicit content type", async () => {
    const server = createMdsnServer();

    server.post("/logout", async () =>
      ok({
        fragment: {
          markdown: "## Signed out",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/logout",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Signed out");
  });

  it("returns a recoverable fragment for malformed markdown bodies instead of throwing", async () => {
    const server = createMdsnServer();

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "# Should not run",
          blocks: []
        }
      })
    );

    await expect(
      server.handle({
        method: "POST",
        url: "https://example.test/login",
        headers: {
          accept: "text/markdown",
          "content-type": "text/markdown"
        },
        body: `nickname=Guest`,
        cookies: {}
      })
    ).resolves.toMatchObject({
      status: 400,
      headers: {
        "content-type": 'text/markdown; profile="https://mdsn.ai/protocol/v1"'
      }
    });
  });

  it("returns a recoverable 500 fragment when an action handler throws", async () => {
    const server = createMdsnServer();

    server.post("/boom", async () => {
      throw new Error("boom");
    });

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/boom",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `message: "hi"`,
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("Internal Server Error");
  });

  it("returns a recoverable 500 fragment when session persistence throws", async () => {
    const server = createMdsnServer({
      session: {
        read: async () => null,
        commit: async () => {
          throw new Error("commit failed");
        },
        clear: async () => undefined
      }
    });

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome",
          blocks: []
        },
        session: signIn({ userId: "user-1" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `nickname: "Guest"`,
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("Internal Server Error");
  });

  it("returns html when the client prefers html", async () => {
    const server = createMdsnServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      query: {},
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("<main");
  });

  it("passes an injected markdown renderer through the html response path", async () => {
    const server = createMdsnServer({
      markdownRenderer: {
        render(markdown) {
          return `<section data-renderer="custom">${markdown.toUpperCase()}</section>`;
        }
      }
    });

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('data-renderer="custom"');
    expect(response.body).toContain("DEMO");
  });

  it("injects discovery links into custom html shells when htmlDiscovery is configured", async () => {
    const renderHtml = vi.fn((fragment, options) => {
      expect(options.protocol?.discovery).toEqual({
        markdownHref: "/list",
        llmsTxtHref: "/llms.txt"
      });

      return `<!doctype html><html lang="en"><head><title>Custom Shell</title></head><body><main>${fragment.markdown}</main></body></html>`;
    });

    const server = createMdsnServer({
      htmlDiscovery: {
        markdownHref: "/list",
        llmsTxtHref: "/llms.txt"
      },
      renderHtml
    });

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('<link rel="alternate" type="text/markdown" href="/list">');
    expect(response.body).toContain('<link rel="llms-txt" href="/llms.txt">');
    expect(response.body).toContain("<title>Custom Shell</title>");
    expect(renderHtml).toHaveBeenCalledTimes(1);
  });

  it("returns markdown when accept explicitly includes text/markdown alongside html", async () => {
    const server = createMdsnServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html, text/markdown" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain("# Demo");
  });

  it("returns 404 when no handler matches", async () => {
    const server = createMdsnServer();

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/missing",
      headers: { accept: "text/markdown" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(404);
    expect(response.body).toContain("Not Found");
  });

  it("returns 406 for unsupported accept headers", async () => {
    const server = createMdsnServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "application/json" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(406);
  });

  it("serves canonical page markdown to agent consumers", async () => {
    const server = createMdsnServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    expect(response.body).toContain('title: "Guestbook"');
    expect(response.body).toContain("## 2 live messages");
    expect(response.body).toContain("- Hello");
    expect(response.body).toContain("```mdsn");
    expect(response.body).toContain('POST "/post" (message) -> submit');
  });

  it("serves rendered html to browser consumers for page routes", async () => {
    const server = createMdsnServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("<!doctype html>");
    expect(response.body).toContain("Guestbook");
    expect(response.body).toContain("2 live messages");
    expect(response.body).toContain("<li>Hello</li>");
  });

  it("auto-resolves explicit auto GET block dependencies for html page responses", async () => {
    const server = createMdsnServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages\n\n- Welcome\n- Hello",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "load_messages", inputs: [], auto: true }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(listHandler).toHaveBeenCalledTimes(1);
    expect(response.body).toContain("2 live messages");
    expect(response.body).not.toContain('action="/list"');
  });

  it("auto-resolves explicit auto GET block dependencies in markdown page responses", async () => {
    const server = createMdsnServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "load_messages", inputs: [], auto: true }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe('text/markdown; profile="https://mdsn.ai/protocol/v1"');
    expect(listHandler).toHaveBeenCalledTimes(1);
    expect(response.body).toContain("2 live messages");
    expect(response.body).not.toContain('GET "/list" -> load_messages auto');
  });

  it("does not auto-resolve manual labeled GET operations for html page responses", async () => {
    const server = createMdsnServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "refresh", inputs: [], label: "Refresh" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(listHandler).not.toHaveBeenCalled();
    expect(response.body).toContain('action="/list"');
    expect(response.body).toContain("Refresh");
  });

  it("auto-resolves explicit auto GET dependencies for html fragment responses", async () => {
    const server = createMdsnServer();

    server.page("/vault", async () => ({
      frontmatter: { title: "Vault" },
      markdown: "# Vault\n\n<!-- mdsn:block vault -->",
      blockContent: {
        vault: "## 0 saved notes\n\n- No private notes yet"
      },
      blocks: [
        {
          name: "vault",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
        }
      ],
      blockAnchors: ["vault"]
    }));

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome Ada\n\nUse `open_vault` to continue.",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("# Vault");
    expect(response.body).toContain("No private notes yet");
    expect(response.body).toContain('action="/vault"');
    expect(response.body).not.toContain("Use `open_vault` to continue.");
    expect(response.body).not.toContain('GET "/vault" -> open_vault');
  });

  it("propagates session mutations from implicit html GET dependencies to later implicit steps", async () => {
    const server = createMdsnServer();
    const sessionAfterLogin = signIn({ userId: "Ada" });

    server.page("/vault", async ({ session }) =>
      session
        ? {
            frontmatter: { title: "Vault" },
            markdown: "# Vault\n\n<!-- mdsn:block vault -->",
            blockContent: {
              vault: "## Welcome Ada"
            },
            blocks: [
              {
                name: "vault",
                inputs: [],
                operations: []
              }
            ],
            blockAnchors: ["vault"]
          }
        : {
            frontmatter: { title: "Vault" },
            markdown: "# Vault\n\n<!-- mdsn:block vault -->",
            blockContent: {
              vault: "## Please sign in"
            },
            blocks: [
              {
                name: "vault",
                inputs: [],
                operations: []
              }
            ],
            blockAnchors: ["vault"]
          }
    );

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Starting login",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/session-ready", name: "continue_login", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    server.get("/session-ready", async ({ session }) =>
      ok({
        fragment: {
          markdown: session ? "## Session already ready" : "## Session ready now",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        },
        session: sessionAfterLogin
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Welcome Ada");
    expect(response.body).not.toContain("Please sign in");
    expect(response.body).not.toContain("Session ready now");
  });

  it("auto-resolves explicit auto GET dependencies in markdown fragment responses", async () => {
    const server = createMdsnServer();

    server.page("/vault", async () => ({
      frontmatter: { title: "Vault" },
      markdown: "# Vault",
      blocks: [],
      blockAnchors: []
    }));

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome Ada\n\nUse `open_vault` to continue.",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe('text/markdown; profile="https://mdsn.ai/protocol/v1"');
    expect(response.body).toContain("# Vault");
    expect(response.body).not.toContain('GET "/vault" -> open_vault auto');
    expect(response.body).not.toContain("Welcome Ada");
  });

  it("rejects event-stream negotiation on page routes", async () => {
    const server = createMdsnServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook",
      blocks: [],
      blockAnchors: []
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    await expect(readBody(response.body)).resolves.toContain("Page routes do not support text/event-stream");
  });

  it("returns a recoverable 500 fragment when a page handler throws", async () => {
    const server = createMdsnServer();

    server.page("/boom", async () => {
      throw new Error("boom");
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/boom",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdsn.ai/protocol/v1"'
    );
    await expect(readBody(response.body)).resolves.toContain("Internal Server Error");
  });
});
