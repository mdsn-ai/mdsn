import {
  parsePage,
  serializeMarkdownBody,
  type MdsnBlock,
  type MdsnHeadlessBlock,
  type MdsnHeadlessBootstrap,
  type MdsnOperation
} from "../core/index.js";

export interface CreateHeadlessHostOptions {
  root: ParentNode;
  fetchImpl?: typeof fetch;
}

export interface HeadlessRuntimeState {
  status: "idle" | "loading" | "error";
  error?: string;
}

export interface HeadlessSnapshot extends HeadlessRuntimeState {
  route?: string;
  markdown: string;
  blocks: MdsnHeadlessBlock[];
}

export type HeadlessListener = (snapshot: HeadlessSnapshot) => void;

export interface MdsnHeadlessHost {
  mount(): void;
  unmount(): void;
  subscribe(listener: HeadlessListener): () => void;
  getSnapshot(): HeadlessSnapshot;
  submit(operation: MdsnOperation, values?: Record<string, string>): Promise<void>;
  visit(target: string): Promise<void>;
}

function findBootstrapScript(root: ParentNode): HTMLScriptElement | null {
  if (root instanceof Document) {
    const element = root.getElementById("mdsn-bootstrap");
    return element instanceof HTMLScriptElement ? element : null;
  }

  for (const child of Array.from(root.childNodes)) {
    if (child instanceof HTMLScriptElement && child.id === "mdsn-bootstrap") {
      return child;
    }
    if (child instanceof Element) {
      const nested = findBootstrapScript(child);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function getDocument(root: ParentNode): Document {
  if (root instanceof Document) {
    return root;
  }
  return root.ownerDocument ?? document;
}

function parseBootstrap(root: ParentNode): MdsnHeadlessBootstrap {
  const element = findBootstrapScript(root);
  if (!(element instanceof HTMLScriptElement) || !element.textContent?.trim()) {
    throw new Error("Missing mdsn bootstrap data.");
  }
  return JSON.parse(element.textContent) as MdsnHeadlessBootstrap;
}

function parseBootstrapFromHtml(content: string): MdsnHeadlessBootstrap {
  const document = new DOMParser().parseFromString(content, "text/html");
  return parseBootstrap(document);
}

function toHeadlessBlock(block: MdsnBlock, markdown: string): MdsnHeadlessBlock {
  return {
    name: block.name,
    markdown,
    inputs: block.inputs,
    operations: block.operations
  };
}

function findOperationBlock(blocks: MdsnHeadlessBlock[], operation: MdsnOperation): MdsnHeadlessBlock | null {
  return (
    blocks.find((block) =>
      block.operations.some(
        (candidate) =>
          candidate.method === operation.method &&
          candidate.target === operation.target &&
          candidate.name === operation.name
      )
    ) ?? null
  );
}

function fragmentBlockFromMarkdown(markdown: string, fallbackBlock: MdsnHeadlessBlock | null): MdsnHeadlessBlock | null {
  const page = parsePage(markdown);
  const trimmedMarkdown = page.markdown.trim();
  const block = page.blocks[0];
  if (block) {
    return toHeadlessBlock(block, trimmedMarkdown);
  }
  if (!fallbackBlock) {
    return null;
  }
  return {
    ...fallbackBlock,
    markdown: trimmedMarkdown
  };
}

function parseSseMessages(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
    )
    .filter(Boolean);
}

function parseSseEvent(rawEvent: string): string | null {
  const message = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  return message || null;
}

function drainSseBuffer(
  buffer: string,
  onMessage: (message: string) => void
): string {
  const normalized = buffer.replaceAll("\r\n", "\n");
  let cursor = normalized;

  while (true) {
    const separatorIndex = cursor.indexOf("\n\n");
    if (separatorIndex === -1) {
      break;
    }

    const rawEvent = cursor.slice(0, separatorIndex);
    cursor = cursor.slice(separatorIndex + 2);
    const message = parseSseEvent(rawEvent);
    if (message) {
      onMessage(message);
    }
  }

  return cursor;
}

function replaceBlock(blocks: MdsnHeadlessBlock[], nextBlock: MdsnHeadlessBlock): MdsnHeadlessBlock[] {
  let replaced = false;
  const next = blocks.map((block) => {
    if (block.name !== nextBlock.name) {
      return block;
    }
    replaced = true;
    return nextBlock;
  });
  if (!replaced) {
    next.push(nextBlock);
  }
  return next;
}

function toSnapshot(bootstrap: MdsnHeadlessBootstrap, current: HeadlessSnapshot | null): HeadlessSnapshot {
  if (bootstrap.kind === "page") {
    const next: HeadlessSnapshot = {
      status: current?.status ?? "idle",
      markdown: bootstrap.markdown,
      blocks: [...bootstrap.blocks]
    };
    const route = bootstrap.route ?? current?.route;
    if (route) {
      next.route = route;
    }
    if (current?.error) {
      next.error = current.error;
    }
    return next;
  }

  const next: HeadlessSnapshot = {
    status: current?.status ?? "idle",
    markdown: current?.markdown ?? "",
    blocks: replaceBlock(current?.blocks ?? [], bootstrap.block)
  };
  if (current?.route) {
    next.route = current.route;
  }
  if (current?.error) {
    next.error = current.error;
  }
  return next;
}

function toQueryString(values: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function pushHistory(target: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.history.pushState({}, "", target);
}

export function createHeadlessHost(options: CreateHeadlessHostOptions): MdsnHeadlessHost {
  const fetchImpl = options.fetchImpl ?? fetch;
  let mounted = false;
  let snapshot = toSnapshot(parseBootstrap(options.root), null);
  let status: HeadlessRuntimeState = { status: "idle" };
  const listeners = new Set<HeadlessListener>();

  function publish(): void {
    const next: HeadlessSnapshot = {
      status: status.status,
      markdown: snapshot.markdown,
      blocks: [...snapshot.blocks]
    };
    if (status.error) {
      next.error = status.error;
    }
    if (snapshot.route) {
      next.route = snapshot.route;
    }

    for (const listener of listeners) {
      listener(next);
    }
  }

  function setStatus(next: HeadlessRuntimeState): void {
    status = next;
    publish();
  }

  async function applyResponse(content: string, updateHistory = false): Promise<void> {
    const bootstrap = parseBootstrapFromHtml(content);
    const previousRoute = snapshot.route;
    snapshot = toSnapshot(bootstrap, snapshot);
    if (updateHistory && bootstrap.kind === "page" && bootstrap.route && bootstrap.route !== previousRoute) {
      pushHistory(bootstrap.route);
    }
    setStatus({ status: "idle" });
  }

  async function request(target: string, init: RequestInit): Promise<void> {
    setStatus({ status: "loading" });
    try {
      const response = await fetchImpl(target, init);
      const content = await response.text();
      await applyResponse(content, true);
    } catch (error) {
      setStatus({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function requestStream(target: string, operation: MdsnOperation): Promise<void> {
    const fallbackBlock = findOperationBlock(snapshot.blocks, operation);
    setStatus({ status: "loading" });

    try {
      const response = await fetchImpl(target, {
        method: "GET",
        headers: {
          accept: "text/event-stream"
        }
      });
      const applyMessage = (message: string) => {
        const nextBlock = fragmentBlockFromMarkdown(message, fallbackBlock);
        if (!nextBlock) {
          return;
        }
        snapshot = {
          ...snapshot,
          blocks: replaceBlock(snapshot.blocks, nextBlock)
        };
        publish();
      };

      if (!response.body) {
        const content = await response.text();
        for (const message of parseSseMessages(content)) {
          applyMessage(message);
        }
        setStatus({ status: "idle" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = drainSseBuffer(buffer, applyMessage);
      }

      buffer += decoder.decode();
      drainSseBuffer(buffer, applyMessage);
      setStatus({ status: "idle" });
    } catch (error) {
      setStatus({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function visit(target: string, updateHistory = false): Promise<void> {
    setStatus({ status: "loading" });
    try {
      const response = await fetchImpl(target, {
        method: "GET",
        headers: {
          accept: "text/html"
        }
      });
      const content = await response.text();
      snapshot = toSnapshot(parseBootstrapFromHtml(content), snapshot);
      if (updateHistory) {
        pushHistory(target);
      }
      setStatus({ status: "idle" });
    } catch (error) {
      setStatus({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  function onPopState(): void {
    const target = `${window.location.pathname}${window.location.search}`;
    void visit(target, false);
  }

  return {
    mount(): void {
      if (mounted || typeof window === "undefined") {
        mounted = true;
        return;
      }
      window.addEventListener("popstate", onPopState);
      mounted = true;
    },
    unmount(): void {
      if (!mounted || typeof window === "undefined") {
        mounted = false;
        return;
      }
      window.removeEventListener("popstate", onPopState);
      mounted = false;
    },
    subscribe(listener: HeadlessListener): () => void {
      listeners.add(listener);
      listener(this.getSnapshot());
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): HeadlessSnapshot {
      const next: HeadlessSnapshot = {
        status: status.status,
        markdown: snapshot.markdown,
        blocks: [...snapshot.blocks]
      };
      if (status.error) {
        next.error = status.error;
      }
      if (snapshot.route) {
        next.route = snapshot.route;
      }
      return next;
    },
    async submit(operation: MdsnOperation, values: Record<string, string> = {}): Promise<void> {
      if (operation.method === "GET") {
        const target = `${operation.target}${toQueryString(values)}`;
        if (operation.accept === "text/event-stream") {
          void requestStream(target, operation);
          return;
        }
        await request(target, {
          method: "GET",
          headers: {
            accept: "text/html"
          }
        });
        return;
      }

      await request(operation.target, {
        method: "POST",
        headers: {
          accept: "text/html",
          "content-type": "text/markdown"
        },
        body: serializeMarkdownBody(values)
      });
    },
    visit(target: string): Promise<void> {
      return visit(target, true);
    }
  };
}
