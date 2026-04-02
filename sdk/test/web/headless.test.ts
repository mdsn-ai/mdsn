import { describe, expect, it, vi } from "vitest";

import { createHeadlessHost } from "../../src/web/index.js";

function createRootWithBootstrap(bootstrap: object): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `<script id="mdsn-bootstrap" type="application/json">${JSON.stringify(bootstrap)}</script>`;
  document.body.innerHTML = "";
  document.body.append(root);
  return root;
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createHeadlessHost", () => {
  it("reads an initial page bootstrap into a framework-friendly snapshot", () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/guestbook",
      markdown: "# Guestbook",
      blocks: [
        {
          name: "guestbook",
          markdown: "## 1 live message\n\n- Hello",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [
            {
              method: "POST",
              target: "/post",
              name: "submit",
              inputs: ["message"],
              label: "Submit"
            }
          ]
        }
      ]
    });

    const host = createHeadlessHost({ root });
    const snapshot = host.getSnapshot();

    expect(snapshot.route).toBe("/guestbook");
    expect(snapshot.markdown).toBe("# Guestbook");
    expect(snapshot.blocks).toHaveLength(1);
    expect(snapshot.blocks[0]?.name).toBe("guestbook");
    expect(snapshot.blocks[0]?.markdown).toContain("1 live message");
  });

  it("merges a block fragment response into the current snapshot without dropping sibling blocks", async () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/vault",
      markdown: "# Vault",
      blocks: [
        {
          name: "session",
          markdown: "## Welcome Ada",
          inputs: [],
          operations: [{ method: "POST", target: "/vault/logout", name: "logout", inputs: [], label: "Log Out" }]
        },
        {
          name: "vault",
          markdown: "## 0 saved notes\n\n- No private notes yet",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
        }
      ]
    });

    const fetchImpl = vi.fn(async () =>
      new Response(
        `<!doctype html><html><body><script id="mdsn-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "vault",
            markdown: "## 1 saved note\n\n- Hello",
            inputs: [{ name: "message", type: "text", required: true, secret: false }],
            operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      )
    );

    const host = createHeadlessHost({ root, fetchImpl });
    await host.submit(host.getSnapshot().blocks[1]!.operations[0]!, { message: "Hello" });
    await flushAsync();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const snapshot = host.getSnapshot();
    expect(snapshot.route).toBe("/vault");
    expect(snapshot.blocks).toHaveLength(2);
    expect(snapshot.blocks[0]?.name).toBe("session");
    expect(snapshot.blocks[0]?.markdown).toContain("Welcome Ada");
    expect(snapshot.blocks[1]?.markdown).toContain("1 saved note");
    expect(snapshot.blocks[1]?.markdown).toContain("Hello");
  });

  it("updates history when a form submit returns a new page route", async () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/register",
      markdown: "# Register",
      blocks: [
        {
          name: "register",
          markdown: "## Create your account",
          inputs: [
            { name: "nickname", type: "text", required: true, secret: false },
            { name: "password", type: "text", required: true, secret: true }
          ],
          operations: [{ method: "POST", target: "/register", name: "register", inputs: ["nickname", "password"], label: "Register" }]
        }
      ]
    });

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `<!doctype html><html><body><script id="mdsn-bootstrap" type="application/json">${JSON.stringify({
            kind: "page",
            route: "/vault",
            markdown: "# Vault",
            blocks: [
              {
                name: "vault",
                markdown: "## 0 saved notes\n\n- No private notes yet",
                inputs: [{ name: "message", type: "text", required: true, secret: false }],
                operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
              }
            ]
          })}</script></body></html>`,
          { headers: { "content-type": "text/html" } }
        )
      );

    const pushState = vi.fn();
    const originalHistory = window.history;
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        ...originalHistory,
        pushState
      }
    });

    try {
      const host = createHeadlessHost({ root, fetchImpl });
      await host.submit(host.getSnapshot().blocks[0]!.operations[0]!, {
        nickname: "Ada",
        password: "1234"
      });
      await flushAsync();

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(pushState).toHaveBeenCalledWith({}, "", "/vault");
      expect(host.getSnapshot().route).toBe("/vault");
      expect(host.getSnapshot().markdown).toBe("# Vault");
    } finally {
      Object.defineProperty(window, "history", {
        configurable: true,
        value: originalHistory
      });
    }
  });

  it("does not push history when a form submit re-renders the current route", async () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/vault",
      markdown: "# Vault",
      blocks: [
        {
          name: "vault",
          markdown: "## Add note",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
        }
      ]
    });

    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        `<!doctype html><html><body><script id="mdsn-bootstrap" type="application/json">${JSON.stringify({
          kind: "page",
          route: "/vault",
          markdown: "# Vault",
          blocks: [
            {
              name: "vault",
              markdown: "## Saved",
              inputs: [{ name: "message", type: "text", required: true, secret: false }],
              operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
            }
          ]
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      )
    );

    const pushState = vi.fn();
    const originalHistory = window.history;
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        ...originalHistory,
        pushState
      }
    });

    try {
      const host = createHeadlessHost({ root, fetchImpl });
      await host.submit(host.getSnapshot().blocks[0]!.operations[0]!, {
        message: "hello"
      });
      await flushAsync();

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(pushState).not.toHaveBeenCalled();
      expect(host.getSnapshot().route).toBe("/vault");
      expect(host.getSnapshot().blocks[0]?.markdown).toContain("Saved");
    } finally {
      Object.defineProperty(window, "history", {
        configurable: true,
        value: originalHistory
      });
    }
  });

  it("uses the root-scoped bootstrap when multiple apps share one document", () => {
    document.body.innerHTML = "";
    const first = document.createElement("div");
    const second = document.createElement("div");
    const firstScript = document.createElement("script");
    firstScript.id = "mdsn-bootstrap";
    firstScript.type = "application/json";
    firstScript.textContent = JSON.stringify({
      kind: "page",
      route: "/one",
      markdown: "# One",
      blocks: []
    });
    const secondScript = document.createElement("script");
    secondScript.id = "mdsn-bootstrap";
    secondScript.type = "application/json";
    secondScript.textContent = JSON.stringify({
      kind: "page",
      route: "/two",
      markdown: "# Two",
      blocks: []
    });
    first.append(firstScript);
    second.append(secondScript);
    document.body.append(first, second);

    const host = createHeadlessHost({ root: second });
    expect(host.getSnapshot().route).toBe("/two");
    expect(host.getSnapshot().markdown).toBe("# Two");
  });

  it("consumes event-stream GET operations and merges streamed markdown into the owning block", async () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/updates",
      markdown: "# Updates",
      blocks: [
        {
          name: "updates",
          markdown: "## Waiting",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/stream",
              name: "watch",
              inputs: [],
              label: "Watch",
              accept: "text/event-stream"
            }
          ]
        }
      ]
    });

    const fetchImpl = vi.fn(async () => {
      return new Response(
        "data: ## Tick\ndata:\ndata: - One\n\n",
        {
          headers: { "content-type": "text/event-stream" }
        }
      );
    });

    const host = createHeadlessHost({ root, fetchImpl });
    await host.submit(host.getSnapshot().blocks[0]!.operations[0]!, {});
    await flushAsync();

    expect(fetchImpl).toHaveBeenCalledWith(
      "/stream",
      expect.objectContaining({
        method: "GET",
        headers: { accept: "text/event-stream" }
      })
    );
    expect(host.getSnapshot().blocks[0]?.markdown).toContain("Tick");
    expect(host.getSnapshot().blocks[0]?.markdown).toContain("One");
  });

  it("updates streamed block content before the event-stream connection closes", async () => {
    const root = createRootWithBootstrap({
      kind: "page",
      route: "/updates",
      markdown: "# Updates",
      blocks: [
        {
          name: "updates",
          markdown: "## Waiting",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/stream",
              name: "watch",
              inputs: [],
              label: "Watch",
              accept: "text/event-stream"
            }
          ]
        }
      ]
    });

    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const fetchImpl = vi.fn(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
          controller.enqueue(new TextEncoder().encode("data: ## Tick\ndata:\ndata: - One\n\n"));
        }
      });
      return new Response(stream, {
        headers: { "content-type": "text/event-stream" }
      });
    });

    const host = createHeadlessHost({ root, fetchImpl });
    await host.submit(host.getSnapshot().blocks[0]!.operations[0]!, {});
    await flushAsync();

    expect(host.getSnapshot().blocks[0]?.markdown).toContain("Tick");
    expect(host.getSnapshot().blocks[0]?.markdown).toContain("One");

    streamController?.close();
    await flushAsync();
  });
});
