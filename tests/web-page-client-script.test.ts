import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { getPageClientRuntimeScript } from "../sdk/src/web/page-client-script";
import { createBlockRegionMarkup } from "../sdk/src/web/block-runtime";

type EventHandler = (event: { target: unknown }) => unknown;

class FakeHTMLElement {
  dataset: Record<string, string> = {};
  hidden = false;
  textContent = "";
  innerHTML = "";
  value = "";
  checked = false;
  disabled = false;
  id = "";
  listeners = new Map<string, EventHandler[]>();

  constructor(initial: Partial<FakeHTMLElement> = {}) {
    Object.assign(this, initial);
  }

  getAttribute(name: string): string | null {
    if (name === "id") {
      return this.id || null;
    }

    if (!name.startsWith("data-")) {
      return null;
    }

    const key = name
      .slice(5)
      .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

    return this.dataset[key] ?? null;
  }

  addEventListener(type: string, handler: EventHandler): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(handler);
    this.listeners.set(type, existing);
  }

  dispatch(type: string): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ target: this });
    }
  }
}

class FakeHTMLInputElement extends FakeHTMLElement {}
class FakeHTMLButtonElement extends FakeHTMLElement {}

class FakeDocument {
  documentElement = { lang: "en" };

  constructor(
    private readonly elements: FakeHTMLElement[],
    private readonly elementsById: Map<string, FakeHTMLElement>,
    private readonly root: FakeHTMLElement,
  ) {}

  getElementById(id: string): FakeHTMLElement | null {
    return this.elementsById.get(id) ?? null;
  }

  querySelector(selector: string): FakeHTMLElement | null {
    if (selector === "[data-mdsn-root]") {
      return this.root;
    }
    if (selector === "[data-mdsn-status]") {
      return this.elements.find((element) => element.dataset.mdsnStatus !== undefined) ?? null;
    }
    return null;
  }

  querySelectorAll(selector: string): FakeHTMLElement[] {
    if (selector === "[data-mdsn-input]") {
      return this.elements.filter((element) => element.dataset.mdsnInput !== undefined);
    }

    if (selector === "[data-mdsn-read]") {
      return this.elements.filter((element) => element.dataset.mdsnRead !== undefined);
    }

    if (selector === "[data-mdsn-write]") {
      return this.elements.filter((element) => element.dataset.mdsnWrite !== undefined);
    }

    return [];
  }
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("new web page client script", () => {
  it("replaces the current block region when an action returns a fragment", async () => {
    const bootstrapElement = new FakeHTMLElement({
      id: "mdsn-bootstrap",
      textContent: JSON.stringify({
        version: "vNext",
        frontmatter: {
          title: "Chat",
        },
        markdown: "# Chat\n\n<!-- mdsn:block chat -->",
        blockAnchors: [{ name: "chat" }],
        blocks: [
          {
            name: "chat",
            inputs: [
              {
                id: "chat::input::message",
                block: "chat",
                name: "message",
                type: "text",
                required: true,
                secret: false,
              },
            ],
            reads: [],
            writes: [
              {
                id: "chat::write::0",
                block: "chat",
                name: "send",
                target: "/messages",
                inputs: ["message"],
                order: 0,
              },
            ],
          },
        ],
        inputState: {
          "chat::input::message": "",
        },
      }),
    });

    const root = new FakeHTMLElement({
      dataset: {
        mdsnRoot: "",
      },
      innerHTML: createBlockRegionMarkup("chat", "<p>Old</p>"),
    });

    const messageInput = new FakeHTMLInputElement({
      id: "chat::input::message",
      dataset: {
        mdsnInput: "chat::input::message",
      },
      value: "hello",
    });

    const sendButton = new FakeHTMLButtonElement({
      dataset: {
        mdsnWrite: "chat::write::0",
      },
    });

    const status = new FakeHTMLElement({
      dataset: {
        mdsnStatus: "",
      },
    });

    const document = new FakeDocument(
      [messageInput, sendButton, status],
      new Map([["mdsn-bootstrap", bootstrapElement]]),
      root,
    );

    const fetchCalls: Array<{ url: string; body?: string }> = [];
    const script = getPageClientRuntimeScript();

    vm.runInNewContext(script, {
      console,
      document,
      window: {
        location: {
          href: "http://localhost/chat",
          pathname: "/chat",
          assign(url: string) {
            this.href = url;
          },
        },
      },
      fetch: async (url: string, options?: { body?: string }) => {
        fetchCalls.push({ url, body: options?.body });
        return {
          headers: {
            get(name: string) {
              return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null;
            },
          },
          async text() {
            return "<h2>Updated</h2><p>Saved from server.</p>";
          },
        };
      },
      HTMLElement: FakeHTMLElement,
      HTMLInputElement: FakeHTMLInputElement,
      HTMLButtonElement: FakeHTMLButtonElement,
      JSON,
      Promise,
      setTimeout,
      clearTimeout,
    });

    sendButton.dispatch("click");
    await flushAsyncWork();

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]?.url).toBe("/messages");
    expect(fetchCalls[0]?.body).toContain('message: "hello"');
    expect(fetchCalls[0]?.body).not.toContain('- message: "hello"');
    expect(fetchCalls[0]?.body).not.toContain("pathname");
    expect(fetchCalls[0]?.body).not.toContain("block");
    expect(root.innerHTML).toContain("<h2>Updated</h2>");
    expect(root.innerHTML).toContain("<p>Saved from server.</p>");
    expect(root.innerHTML).not.toContain("<p>Old</p>");
  });

  it("renders markdown list items from returned fragments as a list instead of one paragraph", async () => {
    const bootstrapElement = new FakeHTMLElement({
      id: "mdsn-bootstrap",
      textContent: JSON.stringify({
        version: "vNext",
        frontmatter: {
          title: "Guestbook",
        },
        markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
        blockAnchors: [{ name: "guestbook" }],
        blocks: [
          {
            name: "guestbook",
            inputs: [],
            reads: [
              {
                id: "guestbook::read::0",
                block: "guestbook",
                name: "refresh",
                target: "/guestbook/list",
                inputs: [],
                order: 0,
              },
            ],
            writes: [],
          },
        ],
        inputState: {},
      }),
    });

    const root = new FakeHTMLElement({
      dataset: {
        mdsnRoot: "",
      },
      innerHTML: createBlockRegionMarkup("guestbook", "<p>Old</p>"),
    });

    const refreshButton = new FakeHTMLButtonElement({
      dataset: {
        mdsnRead: "guestbook::read::0",
      },
    });

    const status = new FakeHTMLElement({
      dataset: {
        mdsnStatus: "",
      },
    });

    const document = new FakeDocument(
      [refreshButton, status],
      new Map([["mdsn-bootstrap", bootstrapElement]]),
      root,
    );

    const script = getPageClientRuntimeScript();

    vm.runInNewContext(script, {
      console,
      document,
      window: {
        location: {
          href: "http://localhost/",
          pathname: "/",
          assign(url: string) {
            this.href = url;
          },
        },
      },
      fetch: async () => ({
        headers: {
          get(name: string) {
            return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null;
          },
        },
        async text() {
          return "<h2>最新留言</h2><ul><li><strong>嗷嗷</strong>: 嗷嗷</li><li><strong>你好</strong>: 你好</li></ul>";
        },
      }),
      HTMLElement: FakeHTMLElement,
      HTMLInputElement: FakeHTMLInputElement,
      HTMLButtonElement: FakeHTMLButtonElement,
      JSON,
      Promise,
      setTimeout,
      clearTimeout,
    });

    refreshButton.dispatch("click");
    await flushAsyncWork();

    expect(root.innerHTML).toContain("<ul>");
    expect(root.innerHTML).toContain("<li>");
    expect(root.innerHTML).not.toContain("<p>- **嗷嗷**: 嗷嗷 - **你好**: 你好</p>");
  });

  it("keeps mapped action targets when a returned fragment contains a new interactive block", async () => {
    const bootstrapElement = new FakeHTMLElement({
      id: "mdsn-bootstrap",
      textContent: JSON.stringify({
        version: "vNext",
        frontmatter: {
          title: "Guestbook",
        },
        markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
        blockAnchors: [{ name: "guestbook" }],
        blocks: [
          {
            name: "guestbook",
            inputs: [
              {
                id: "guestbook::input::message",
                block: "guestbook",
                name: "message",
                type: "text",
                required: true,
                secret: false,
              },
            ],
            reads: [],
            writes: [
              {
                id: "guestbook::write::0",
                block: "guestbook",
                name: "send",
                target: "/guestbook/post",
                inputs: ["message"],
                order: 0,
              },
            ],
          },
        ],
        inputState: {
          "guestbook::input::message": "",
        },
      }),
    });

    const root = new FakeHTMLElement({
      dataset: {
        mdsnRoot: "",
      },
      innerHTML: createBlockRegionMarkup("guestbook", "<p>Old</p>"),
    });

    const messageInput = new FakeHTMLInputElement({
      id: "guestbook::input::message",
      dataset: {
        mdsnInput: "guestbook::input::message",
      },
      value: "hello",
    });

    const sendButton = new FakeHTMLButtonElement({
      dataset: {
        mdsnWrite: "guestbook::write::0",
      },
    });

    const status = new FakeHTMLElement({
      dataset: {
        mdsnStatus: "",
      },
    });

    const document = new FakeDocument(
      [messageInput, sendButton, status],
      new Map([["mdsn-bootstrap", bootstrapElement]]),
      root,
    );

    const script = getPageClientRuntimeScript();

    vm.runInNewContext(script, {
      console,
      document,
      window: {
        location: {
          href: "http://localhost/",
          pathname: "/",
          assign(url: string) {
            this.href = url;
          },
        },
      },
      fetch: async () => ({
        headers: {
          get(name: string) {
            return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null;
          },
        },
        async text() {
          return `<h2>Latest</h2><section class="mdsn-block-panel" data-mdsn-block-panel="guestbook"><header><strong>guestbook</strong></header><div class="mdsn-block-inputs"><label>message<input id="guestbook::input::message" type="text" data-mdsn-input="guestbook::input::message" data-input-name="message" data-input-type="text" data-required="true" required /></label></div><div class="mdsn-block-actions"><button type="button" data-mdsn-write="guestbook::write::0" data-op-name="submit" data-target="/__mdsn/actions/guestbook/post" data-inputs="message">submit</button></div></section>`;
        },
      }),
      HTMLElement: FakeHTMLElement,
      HTMLInputElement: FakeHTMLInputElement,
      HTMLButtonElement: FakeHTMLButtonElement,
      JSON,
      Promise,
      setTimeout,
      clearTimeout,
    });

    sendButton.dispatch("click");
    await flushAsyncWork();

    expect(root.innerHTML).toContain('data-target="/__mdsn/actions/guestbook/post"');
    expect(root.innerHTML).not.toContain('data-target="/guestbook/post"');
  });

  it("rebinds actions after replacing a block with a new interactive fragment", async () => {
    const bootstrapElement = new FakeHTMLElement({
      id: "mdsn-bootstrap",
      textContent: JSON.stringify({
        version: "vNext",
        frontmatter: {
          title: "Guestbook",
        },
        markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
        blockAnchors: [{ name: "guestbook" }],
        blocks: [
          {
            name: "guestbook",
            inputs: [
              {
                id: "guestbook::input::message",
                block: "guestbook",
                name: "message",
                type: "text",
                required: true,
                secret: false,
              },
            ],
            reads: [],
            writes: [
              {
                id: "guestbook::write::0",
                block: "guestbook",
                name: "send",
                target: "/guestbook/post",
                inputs: ["message"],
                order: 0,
              },
            ],
          },
        ],
        inputState: {
          "guestbook::input::message": "",
        },
      }),
    });

    const root = new FakeHTMLElement({
      dataset: {
        mdsnRoot: "",
      },
      innerHTML: createBlockRegionMarkup("guestbook", "<p>Old</p>"),
    });

    const initialInput = new FakeHTMLInputElement({
      id: "guestbook::input::message",
      dataset: {
        mdsnInput: "guestbook::input::message",
      },
      value: "first",
    });

    const initialButton = new FakeHTMLButtonElement({
      dataset: {
        mdsnWrite: "guestbook::write::0",
      },
    });

    const status = new FakeHTMLElement({
      dataset: {
        mdsnStatus: "",
      },
    });

    const elements = [initialInput, initialButton, status];
    const document = new FakeDocument(
      elements,
      new Map([["mdsn-bootstrap", bootstrapElement]]),
      root,
    );

    const fetchCalls: string[] = [];
    let latestInput: FakeHTMLInputElement | null = null;
    let latestButton: FakeHTMLButtonElement | null = null;
    const script = getPageClientRuntimeScript();

    vm.runInNewContext(script, {
      console,
      document,
      window: {
        location: {
          href: "http://localhost/",
          pathname: "/",
          assign(url: string) {
            this.href = url;
          },
        },
      },
      fetch: async (url: string) => {
        fetchCalls.push(url);

        if (fetchCalls.length === 1) {
          latestInput = new FakeHTMLInputElement({
            id: "guestbook::input::message",
            dataset: {
              mdsnInput: "guestbook::input::message",
              inputName: "message",
              inputType: "text",
              required: "true",
            },
            value: "second",
          });

          latestButton = new FakeHTMLButtonElement({
            dataset: {
              mdsnWrite: "guestbook::write::0",
              opName: "send",
              target: "/__mdsn/actions/guestbook/post",
              inputs: "message",
            },
          });

          elements.push(latestInput, latestButton);
        }

        return {
          headers: {
            get(name: string) {
              return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null;
            },
          },
          async text() {
            return `<h2>Latest</h2><section class="mdsn-block-panel" data-mdsn-block-panel="guestbook"><header><strong>guestbook</strong></header><div class="mdsn-block-inputs"><label>message<input id="guestbook::input::message" type="text" data-mdsn-input="guestbook::input::message" data-input-name="message" data-input-type="text" data-required="true" required /></label></div><div class="mdsn-block-actions"><button type="button" data-mdsn-write="guestbook::write::0" data-op-name="send" data-target="/__mdsn/actions/guestbook/post" data-inputs="message">send</button></div></section>`;
          },
        };
      },
      HTMLElement: FakeHTMLElement,
      HTMLInputElement: FakeHTMLInputElement,
      HTMLButtonElement: FakeHTMLButtonElement,
      JSON,
      Promise,
      setTimeout,
      clearTimeout,
    });

    initialButton.dispatch("click");
    await flushAsyncWork();

    const replacementButton = latestButton as FakeHTMLButtonElement | null;
    expect(replacementButton).not.toBeNull();
    if (!replacementButton) {
      throw new Error("Expected replacement button");
    }
    (replacementButton as FakeHTMLButtonElement).dispatch("click");
    await flushAsyncWork();

    expect(fetchCalls).toHaveLength(2);
  });
});
