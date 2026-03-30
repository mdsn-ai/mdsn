import { composePage } from "@mdsn/core";
import { describe, expect, it } from "vitest";

import { createHostedApp, stream } from "../src/index.js";

describe("createHostedApp", () => {
  it("serves pages and block-bound actions from a compact hosted app definition", async () => {
    const messages = ["Welcome"];
    const source = `---
title: Guestbook
---

# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
\`\`\``;

    function renderPage() {
      return composePage(source, {
        blocks: {
          guestbook: `## ${messages.length} live message${messages.length === 1 ? "" : "s"}\n\n${messages
            .map((message) => `- ${message}`)
            .join("\n")}`
        }
      });
    }

    const app = createHostedApp({
      pages: {
        "/guestbook": renderPage
      },
      actions: [
        {
          target: "/list",
          methods: ["GET"],
          routePath: "/guestbook",
          blockName: "guestbook",
          handler: ({ block }) => block()
        },
        {
          target: "/post",
          methods: ["POST"],
          routePath: "/guestbook",
          blockName: "guestbook",
          handler: ({ inputs, block }) => {
            if (inputs.message) {
              messages.push(inputs.message);
            }
            return block();
          }
        }
      ]
    });

    const pageResponse = await app.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.body).toContain('title: "Guestbook"');
    expect(pageResponse.body).toContain('GET "/list" -> refresh');

    const actionResponse = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Hello"',
      cookies: {}
    });

    expect(actionResponse.status).toBe(200);
    expect(actionResponse.body).toContain("## 2 live messages");
    expect(actionResponse.body).toContain("- Hello");
    expect(actionResponse.body).toContain('POST "/post" (message) -> submit');
  });

  it("binds stream GET targets and preserves event-stream behavior", async () => {
    const source = `# Updates

<!-- mdsn:block updates -->

\`\`\`mdsn
BLOCK updates {
  GET "/stream" accept:"text/event-stream"
}
\`\`\``;

    const app = createHostedApp({
      pages: {
        "/updates": () =>
          composePage(source, {
            blocks: {
              updates: "## Waiting"
            }
          })
      },
      actions: [
        {
          target: "/stream",
          methods: ["GET"],
          routePath: "/updates",
          blockName: "updates",
          handler: () =>
            stream(
              (async function* () {
                yield {
                  markdown: "## Tick",
                  blocks: []
                };
              })()
            )
        }
      ]
    });

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/stream",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    let body = "";
    for await (const chunk of response.body as AsyncIterable<string>) {
      body += chunk;
    }
    expect(body).toContain("data: ## Tick");
  });

  it("registers actions from explicit bindings even when the anonymous page render hides that block", async () => {
    const signedOutSource = `# Sign In`;
    const signedInSource = `# Secret

<!-- mdsn:block secure -->

\`\`\`mdsn
BLOCK secure {
  INPUT text -> message
  POST "/shared" (message) -> save
}
\`\`\``;

    const app = createHostedApp({
      session: {
        async read(request) {
          return request.cookies.mdsn_session ? { userId: "Ada" } : null;
        },
        async commit() {},
        async clear() {}
      },
      pages: {
        "/account": ({ session }) =>
          session
            ? composePage(signedInSource, {
                blocks: {
                  secure: `## Saved for ${session.userId}`
                }
              })
            : composePage(signedOutSource)
      },
      actions: [
        {
          target: "/shared",
          methods: ["POST"],
          routePath: "/account",
          blockName: "secure",
          handler: ({ block }) => block()
        }
      ]
    });

    const response = await app.handle({
      method: "POST",
      url: "https://example.test/shared",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "hi"',
      cookies: {
        mdsn_session: "session-1"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("## Saved for Ada");
    expect(response.body).toContain('POST "/shared" (message) -> save');
  });

  it("rejects duplicate method and target registrations", () => {
    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One"),
          "/two": () => composePage("# Two")
        },
        actions: [
          {
            target: "/shared",
            methods: ["GET"],
            routePath: "/one",
            blockName: "first",
            handler: ({ block }) => block()
          },
          {
            target: "/shared",
            methods: ["GET"],
            routePath: "/two",
            blockName: "second",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/must bind to one stable block context/);
  });

  it("rejects invalid explicit action bindings at startup", () => {
    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One")
        },
        actions: [
          {
            target: "/missing",
            methods: ["GET"],
            routePath: "/missing",
            blockName: "guestbook",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/Unknown hosted page route "\/missing"/);

    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One")
        },
        actions: [
          {
            target: "/dup",
            methods: ["POST", "POST"],
            routePath: "/one",
            blockName: "guestbook",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/cannot declare duplicate methods/);
  });
});
