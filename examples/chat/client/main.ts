import { computed, createApp, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { VNodeChild } from "vue";
import type { BlockDefinition } from "@mdsnai/sdk/core";
import type {
  MarkdownBlockNode,
  MarkdownInlineNode,
  ParsedFragment,
  ParsedPage,
} from "@mdsnai/sdk/web";
import { parseFragment, parsePage } from "@mdsnai/sdk/web";
import {
  extractChatMessages,
  resolveAuthDraftAfterFailure,
  scrollChatStreamToBottom,
} from "./model";
import type { AuthMode } from "./model";

type MarkdownActionSuccess = {
  ok: true;
  markdown: string;
};

type MarkdownActionFailure = {
  ok: false;
  markdown: string;
};

type SessionUser = {
  username: string;
  email: string;
};

type UiRouteContext = {
  mdsnRoute: "/" | "/register" | "/chat";
  useWebRoutes: boolean;
};

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function resolveUiRoute(pathname: string): UiRouteContext {
  const normalized = normalizePathname(pathname);
  if (normalized === "/web/chat") {
    return { mdsnRoute: "/chat", useWebRoutes: true };
  }
  if (normalized === "/web/register") {
    return { mdsnRoute: "/register", useWebRoutes: true };
  }
  if (normalized === "/web") {
    return { mdsnRoute: "/", useWebRoutes: true };
  }
  if (normalized === "/chat") {
    return { mdsnRoute: "/chat", useWebRoutes: false };
  }
  if (normalized === "/register") {
    return { mdsnRoute: "/register", useWebRoutes: false };
  }
  return { mdsnRoute: "/", useWebRoutes: false };
}

function toUiRoute(location: string, route: UiRouteContext): string {
  if (!route.useWebRoutes) {
    return location;
  }
  if (location === "/") {
    return "/web";
  }
  if (location === "/register" || location === "/chat") {
    return `/web${location}`;
  }
  return location;
}

function parseMarkdownScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (
    trimmed.startsWith("{")
    || trimmed.startsWith("[")
    || trimmed.startsWith("\"")
    || trimmed === "true"
    || trimmed === "false"
    || trimmed === "null"
    || /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/u.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through and keep the original text.
    }
  }
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function splitTopLevelMarkdownPairs(source: string): string[] {
  const pairs: string[] = [];
  let current = "";
  let depthObject = 0;
  let depthArray = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  const flushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) {
      pairs.push(trimmed);
    }
    current = "";
  };

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "\\") {
        escaped = true;
      } else if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }
    if (char === "\"") {
      inDoubleQuote = true;
      current += char;
      continue;
    }
    if (char === "{") {
      depthObject += 1;
      current += char;
      continue;
    }
    if (char === "}") {
      depthObject = Math.max(0, depthObject - 1);
      current += char;
      continue;
    }
    if (char === "[") {
      depthArray += 1;
      current += char;
      continue;
    }
    if (char === "]") {
      depthArray = Math.max(0, depthArray - 1);
      current += char;
      continue;
    }

    const isTopLevel = depthObject === 0 && depthArray === 0;
    if (isTopLevel && (char === "," || char === "，" || char === "\n" || char === "\r")) {
      flushCurrent();
      continue;
    }

    current += char;
  }

  flushCurrent();
  return pairs;
}

function parseMarkdownKeyValueFields(markdown: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const line of splitTopLevelMarkdownPairs(markdown)) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const name = line.slice(0, separator).trim();
    if (!/^[a-zA-Z_][\w-]*$/u.test(name)) {
      continue;
    }
    fields[name] = parseMarkdownScalar(line.slice(separator + 1));
  }
  return fields;
}

function parseSessionFromMarkdown(markdown: string): SessionUser | null {
  const fields = parseMarkdownKeyValueFields(markdown);
  const username = typeof fields.username === "string" ? fields.username.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  if (!username || !email) {
    return null;
  }
  return {
    username,
    email,
  };
}

function renderInlineNodes(nodes: MarkdownInlineNode[]): VNodeChild[] {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return h("strong", { key }, renderInlineNodes(node.children));
      case "em":
        return h("em", { key }, renderInlineNodes(node.children));
      case "inline_code":
        return h("code", { key }, node.value);
      case "link":
        return h("a", { key, href: node.href, title: node.title }, renderInlineNodes(node.children));
      case "image":
        return h("img", { key, src: node.src, alt: node.alt, title: node.title });
      case "softbreak":
        return "\n";
      case "hardbreak":
        return h("br", { key });
      case "html_inline":
        return h("span", { key, innerHTML: node.value });
    }
  });
}

function renderBlockNodes(nodes: MarkdownBlockNode[]): VNodeChild[] {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    switch (node.type) {
      case "heading":
        return h(`h${Math.min(node.depth, 6)}`, { key }, renderInlineNodes(node.children));
      case "paragraph":
        return h("p", { key }, renderInlineNodes(node.children));
      case "list": {
        const tag = node.ordered ? "ol" : "ul";
        return h(tag, { key, start: node.ordered ? node.start : undefined }, node.items.map((item, itemIndex) =>
          h("li", { key: `${key}-${itemIndex}` }, renderBlockNodes(item))));
      }
      case "blockquote":
        return h("blockquote", { key }, renderBlockNodes(node.children));
      case "code":
        return h("pre", { key }, [h("code", node.value)]);
      case "html":
        return h("div", { key, innerHTML: node.value });
      case "thematic_break":
        return h("hr", { key });
      case "table":
        return h("table", { key }, [
          h("thead", [
            h("tr", node.header.map((cell, cellIndex) =>
              h("th", { key: `${key}-head-${cellIndex}` }, renderInlineNodes(cell)))),
          ]),
          h("tbody", node.rows.map((row, rowIndex) =>
            h("tr", { key: `${key}-row-${rowIndex}` }, row.map((cell, cellIndex) =>
              h("td", { key: `${key}-cell-${rowIndex}-${cellIndex}` }, renderInlineNodes(cell)))))),
        ]);
    }
  });
}

function findBlock(page: ParsedPage, name: string): BlockDefinition | undefined {
  return page.blocks.find((block) => block.name === name);
}

function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) {
    return null;
  }
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}

function findContinueTarget(block: BlockDefinition | undefined): string | null {
  if (!block) {
    return null;
  }
  return block.reads[0]?.target ?? null;
}

function serializeInputsAsMarkdown(inputs: Record<string, unknown>): string {
  return Object.entries(inputs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
    .join(", ");
}

function applyQueryParams(target: string, inputs: Record<string, unknown>): string {
  if (Object.keys(inputs).length === 0) {
    return target;
  }
  const [basePath, rawQuery = ""] = target.split("?");
  const params = new URLSearchParams(rawQuery);
  for (const [name, value] of Object.entries(inputs)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(name, String(value));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

async function requestMarkdownAction(
  method: "GET" | "POST",
  target: string,
  inputs: Record<string, unknown>,
): Promise<MarkdownActionSuccess | MarkdownActionFailure> {
  const requestTarget = method === "GET" ? applyQueryParams(target, inputs) : target;
  const response = await fetch(requestTarget, method === "GET"
    ? {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "text/markdown",
      },
    }
    : {
      method,
      credentials: "same-origin",
      headers: {
        "content-type": "text/markdown",
        Accept: "text/markdown",
      },
      body: serializeInputsAsMarkdown(inputs),
    });
  const markdown = await response.text();

  if (response.ok) {
    return {
      ok: true,
      markdown,
    };
  }

  return {
    ok: false,
    markdown,
  };
}

async function postAuthAction(target: string, inputs: Record<string, unknown>): Promise<ParsedFragment> {
  const response = await requestMarkdownAction("POST", target, inputs);
  return parseFragment(response.markdown);
}

async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/session", {
    credentials: "same-origin",
    headers: {
      Accept: "text/markdown",
    },
  });
  if (response.status === 401) {
    return null;
  }
  return parseSessionFromMarkdown(await response.text());
}

const AuthWindow = {
  props: {
    page: {
      type: Object,
      required: true,
    },
    fragment: {
      type: Object,
      default: null,
    },
    mode: {
      type: String,
      required: true,
    },
    route: {
      type: Object,
      required: true,
    },
  },
  emits: ["fragment"],
  setup(
    props: { page: ParsedPage; fragment: ParsedFragment | null; mode: string; route: UiRouteContext },
    { emit }: { emit: (event: "fragment", fragment: ParsedFragment | null) => void },
  ) {
    const username = ref("");
    const email = ref("");
    const password = ref("");
    const busy = ref(false);

    const block = computed(() => props.fragment?.block ?? findBlock(props.page, "auth"));
    const navBlock = computed(() => findBlock(props.page, "auth-nav"));
    const submitActionName = computed(() => props.mode === "register" ? "register" : "login");
    const navTarget = computed(() => findContinueTarget(navBlock.value));
    const navLabel = computed(() => props.mode === "register" ? "Back to Login" : "Create Account");
    const fragmentContainers = computed(() => props.fragment?.containers ?? []);

    async function submit(event: Event) {
      event.preventDefault();
      const target = findTarget(block.value, "write", submitActionName.value);
      if (!target) {
        return;
      }

      busy.value = true;
      const result = await postAuthAction(target, {
        username: username.value,
        email: email.value,
        password: password.value,
      });
      busy.value = false;

      const continueTarget = findContinueTarget(result.block);
      if (continueTarget) {
        window.location.assign(toUiRoute(continueTarget, props.route));
        return;
      }

      emit("fragment", result);
      const nextDraft = resolveAuthDraftAfterFailure(props.mode === "register" ? "register" : "login", {
        username: username.value,
        email: email.value,
        password: password.value,
      });
      username.value = nextDraft.username;
      email.value = nextDraft.email;
      password.value = nextDraft.password;
    }

    return () => h("section", { class: "vc-auth-card" }, [
      h("div", { class: "vc-auth-card-header" }, [
        h("div", { class: "vc-chat-title" }, props.mode === "register" ? "Create an account" : "Log in"),
        h("p", { class: "vc-auth-copy" }, props.mode === "register"
          ? "Choose a username, email, and password, then jump into the shared chat."
          : "Log in with your email and password to continue to the shared chat."),
      ]),
      ...fragmentContainers.value.map((container) =>
        h("div", { key: container.id, class: "vc-auth-feedback" }, renderBlockNodes(container.nodes))),
      h("form", { class: "vc-auth-form", onSubmit: submit }, [
        props.mode === "register"
          ? h("label", { class: "vc-field" }, [
            h("span", { class: "vc-field-label" }, "Username"),
            h("input", {
              class: "vc-field-input",
              value: username.value,
              autocomplete: "username",
              onInput: (event: Event) => {
                username.value = (event.target as HTMLInputElement).value;
              },
            }),
          ])
          : null,
        h("label", { class: "vc-field" }, [
          h("span", { class: "vc-field-label" }, "Email"),
          h("input", {
            class: "vc-field-input",
            value: email.value,
            autocomplete: "email",
            onInput: (event: Event) => {
              email.value = (event.target as HTMLInputElement).value;
            },
          }),
        ]),
        h("label", { class: "vc-field" }, [
          h("span", { class: "vc-field-label" }, "Password"),
          h("input", {
            class: "vc-field-input",
            type: "password",
            value: password.value,
            autocomplete: "current-password",
            onInput: (event: Event) => {
              password.value = (event.target as HTMLInputElement).value;
            },
          }),
        ]),
        h("button", {
          type: "submit",
          class: "vc-primary-button",
          disabled: busy.value,
        }, busy.value ? (props.mode === "register" ? "Creating…" : "Entering…") : (props.mode === "register" ? "Create Account" : "Enter Chat")),
      ]),
      navTarget.value ? h("div", { class: "vc-auth-nav" }, [
        h("button", {
          type: "button",
          class: "vc-auth-nav-button",
          onClick: () => {
            window.location.assign(toUiRoute(navTarget.value!, props.route));
          },
        }, navLabel.value),
      ]) : null,
    ]);
  },
};

const ChatWindow = {
  props: {
    page: {
      type: Object,
      required: true,
    },
    fragment: {
      type: Object,
      default: null,
    },
    user: {
      type: Object,
      required: true,
    },
    route: {
      type: Object,
      required: true,
    },
  },
  emits: ["fragment"],
  setup(
    props: { page: ParsedPage; fragment: ParsedFragment | null; user: SessionUser; route: UiRouteContext },
    { emit }: { emit: (event: "fragment", fragment: ParsedFragment) => void },
  ) {
    const message = ref("");
    const busy = ref(false);
    const error = ref<string | null>(null);
    const streamElement = ref<HTMLElement | null>(null);
    let pendingScrollAnchor: "bottom" | "top" | "none" = "bottom";

    const block = computed(() => props.fragment?.block ?? findBlock(props.page, "chat"));
    const sessionBlock = computed(() => findBlock(props.page, "session"));
    const messages = computed(() => props.fragment ? extractChatMessages(props.fragment) : []);
    const messageCountLabel = computed(() => `${messages.value.length} messages`);
    const messagesTarget = computed(() => findTarget(block.value, "read", "messages"));
    const moreTarget = computed(() => findTarget(block.value, "read", "more"));

    watch(() => props.fragment, async () => {
      if (pendingScrollAnchor === "none") {
        return;
      }
      await nextTick();
      const stream = streamElement.value;
      if (!stream) {
        pendingScrollAnchor = "none";
        return;
      }
      if (pendingScrollAnchor === "top") {
        stream.scrollTop = 0;
      } else if (pendingScrollAnchor === "bottom") {
        scrollChatStreamToBottom(stream);
      }
      pendingScrollAnchor = "none";
    });

    async function refresh() {
      const target = messagesTarget.value;
      if (!target) return;
      busy.value = true;
      error.value = null;
      const result = await requestMarkdownAction("GET", target, {});
      busy.value = false;
      pendingScrollAnchor = "bottom";
      emit("fragment", parseFragment(result.markdown));
    }

    async function loadMore() {
      const target = moreTarget.value;
      if (!target) return;
      busy.value = true;
      error.value = null;
      const result = await requestMarkdownAction("GET", target, {});
      busy.value = false;
      const currentCount = messages.value.length;
      const nextFragment = parseFragment(result.markdown);
      const nextCount = extractChatMessages(nextFragment).length;
      if (nextCount <= currentCount) {
        error.value = "No older messages are available yet.";
        pendingScrollAnchor = "none";
      } else {
        pendingScrollAnchor = "top";
      }
      emit("fragment", nextFragment);
    }

    async function submit(event: Event) {
      event.preventDefault();
      const target = findTarget(block.value, "write", "send");
      if (!target) {
        return;
      }

      busy.value = true;
      error.value = null;
      const result = await requestMarkdownAction("POST", target, {
        message: message.value,
      });
      busy.value = false;

      if (result.ok) {
        message.value = "";
      }
      pendingScrollAnchor = "bottom";
      emit("fragment", parseFragment(result.markdown));
    }

    async function handleComposerKeydown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      await submit(event);
    }

    async function logout() {
      const target = findTarget(sessionBlock.value, "write", "logout");
      if (!target) {
        return;
      }

      busy.value = true;
      error.value = null;
      const result = await requestMarkdownAction("POST", target, {});
      busy.value = false;

      const fragmentResult = parseFragment(result.markdown);
      const continueTarget = findContinueTarget(fragmentResult.block);
      if (!continueTarget) {
        error.value = "Logout completed but no follow-up action target was returned.";
        return;
      }

      window.location.assign(toUiRoute(continueTarget, props.route));
    }

    return () => h("section", { class: "vc-chat-window" }, [
      h("div", { class: "vc-chat-header" }, [
        h("div", { class: "vc-chat-title" }, "Room"),
        h("div", { style: "display:flex; align-items:center; gap:12px;" }, [
          h("div", { class: "vc-agent-chip", style: "background:#e0f2fe; color:#0c4a6e;" }, messageCountLabel.value),
          h("div", { class: "vc-agent-chip" }, `You are ${props.user.username}`),
          h("button", {
            type: "button",
            class: "vc-secondary-button",
            disabled: busy.value,
            onClick: logout,
          }, "Log Out"),
        ]),
      ]),
      h("div", {
        class: "vc-chat-stream",
        ref: streamElement,
      }, [
        h("div", { class: "vc-chat-stream-inner" }, messages.value.length > 0
          ? messages.value.map((entry, index) => {
            const self = entry.agent === props.user.username;
            return h("article", {
              key: `${entry.time}-${entry.agent}-${index}`,
              class: ["vc-message-row", self ? "is-self" : "is-other"],
            }, [
              h("div", { class: ["vc-message-bubble", self ? "is-self" : "is-other"] }, [
                h("div", { class: "vc-message-meta" }, `${entry.time} · ${entry.agent}`),
                h("div", { class: "vc-message-body" }, entry.message),
              ]),
            ]);
          })
          : [h("div", { class: "vc-empty-state" }, "No messages yet. Start the conversation.")]),
      ]),
      h("form", { class: "vc-composer", onSubmit: submit }, [
        h("textarea", {
          class: "vc-composer-input",
          rows: 3,
          placeholder: "Type a message…",
          value: message.value,
          onKeydown: handleComposerKeydown,
          onInput: (event: Event) => {
            message.value = (event.target as HTMLTextAreaElement).value;
          },
        }),
        error.value ? h("p", { class: "vc-error" }, error.value) : null,
        h("div", { class: "vc-composer-actions" }, [
          h("div", { style: "display:flex; align-items:center; gap:10px;" }, [
            h("button", {
              type: "button",
              class: "vc-secondary-button",
              disabled: busy.value || !messagesTarget.value,
              onClick: refresh,
            }, "Refresh"),
            moreTarget.value ? h("button", {
              type: "button",
              class: "vc-secondary-button",
              disabled: busy.value,
              onClick: loadMore,
            }, "Load More") : null,
          ]),
          h("button", {
            type: "submit",
            class: "vc-primary-button",
            disabled: busy.value,
          }, "Send"),
        ]),
      ]),
    ]);
  },
};

const App = {
  setup() {
    const route = resolveUiRoute(window.location.pathname);
    const routePath = route.mdsnRoute;
    const pageSource = ref("");
    const fragment = ref<ParsedFragment | null>(null);
    const loading = ref(true);
    const session = ref<SessionUser | null>(null);
    let eventSource: EventSource | null = null;

    const page = computed(() => (pageSource.value ? parsePage(pageSource.value) : null));

    async function loadPageSource() {
      const response = await fetch(`/page.md?route=${encodeURIComponent(routePath)}`, {
        credentials: "same-origin",
        headers: {
          Accept: "text/markdown",
        },
      });
      pageSource.value = await response.text();
    }

    async function refreshFragment() {
      const refreshResponse = await requestMarkdownAction("GET", "/list", {});
      fragment.value = parseFragment(refreshResponse.markdown);
    }

    onMounted(async () => {
      await loadPageSource();

      if (routePath === "/chat") {
        session.value = await fetchSession();
        if (!session.value) {
          window.location.assign(toUiRoute("/", route));
          return;
        }

        await refreshFragment();

        eventSource = new EventSource("/stream");
        eventSource.addEventListener("refresh", () => {
          void refreshFragment();
        });
      }

      loading.value = false;
    });

    onBeforeUnmount(() => {
      eventSource?.close();
      eventSource = null;
    });

    return () => {
      if (!page.value) {
        return h("main", { class: "vc-shell" }, [h("p", { class: "vc-loading" }, "Loading chat…")]);
      }

      const introContainers = page.value.segments
        .filter((segment) => segment.type === "container")
        .map((segment) => segment.container);

      if (routePath === "/" || routePath === "/register") {
        return h("main", { class: "vc-shell" }, [
          h("section", { class: "vc-hero" }, loading.value
            ? [h("p", { class: "vc-loading" }, "Loading login…")]
            : introContainers.map((container) => h("div", { key: container.id }, renderBlockNodes(container.nodes)))),
          h(AuthWindow, {
            page: page.value,
            fragment: fragment.value,
            mode: routePath === "/register" ? "register" : "login",
            route,
            onFragment: (nextFragment: ParsedFragment | null) => {
              fragment.value = nextFragment;
            },
          }),
        ]);
      }

      return h("main", { class: "vc-shell" }, [
        h("section", { class: "vc-hero" }, loading.value
          ? [h("p", { class: "vc-loading" }, "Loading chat…")]
          : introContainers.map((container) => h("div", { key: container.id }, renderBlockNodes(container.nodes)))),
        session.value ? h(ChatWindow, {
          page: page.value,
          fragment: fragment.value,
          user: session.value,
          route,
          onFragment: (nextFragment: ParsedFragment) => {
            fragment.value = nextFragment;
          },
        }) : null,
      ]);
    };
  },
};

createApp(App).mount("#vue-chat-root");
