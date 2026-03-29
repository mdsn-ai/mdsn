---
title: Custom Rendering with Vue
description: Use @mdsnai/sdk/web headless APIs and render your own MDSN UI in Vue
layout: docs
---

# Custom Rendering with Vue

This tutorial uses the shortest Vue path:

- pages and actions still use the MDSN protocol
- the client does not use the default renderer
- Vue renders static Markdown, block panels, inputs, and buttons itself

This is a good fit for skills apps, agent apps, and interactive documents that want a custom Vue UI while keeping the MDSN page and action model.

To keep the ideas clear, this guide uses a guestbook instead of the more advanced chat demo.

## 1. The target structure

The smallest useful shape has three layers:

1. page file
   - `pages/index.md`
2. server actions
   - `server/actions.ts` or `server/actions.cjs`
3. Vue client
   - `client/main.ts`

Where:

- the page defines static content and `mdsn:block`
- actions return new Markdown fragments
- the Vue client parses those fragments and renders the UI itself

## 2. The page file does not change

`pages/index.md`:

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

This is a minimal runnable guestbook.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

The two important ideas are:

- `# Guestbook` is still plain Markdown
- `<!-- mdsn:block guestbook -->` is the dynamic region Vue will take over

## 3. Server actions return fragments

The server should return new Markdown fragments, not a JSON result view model.

A small `server/actions.ts` looks like this:

```ts
import {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
} from "@mdsnai/sdk/server";

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" as const },
    { name: "message", type: "text" as const, required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

const messages: Array<{ nickname: string; message: string }> = [];

function renderGuestbookFragment() {
  return renderMarkdownFragment({
    body: [
      "## Latest Messages",
      messages.length > 0
        ? renderMarkdownValue(
            "list",
            messages.map((entry) => `**${entry.nickname}**: ${entry.message}`),
          )
        : "_No messages yet._",
    ],
    block: guestbookBlock,
  });
}
```

## 4. Parse the page and fragment in Vue

The core of the client is:

```ts
import { parseFragment, parsePage } from "@mdsnai/sdk/web";

const page = parsePage(pageMarkdown);
const fragment = parseFragment(fragmentMarkdown);
```

These return structure, not fixed HTML:

- `parsePage()`
  - gives you page `segments`, `blocks`, and `anchors`
- `parseFragment()`
  - gives you fragment `containers` and `block`

That means:

- the page structure comes from `parsePage()`
- the current block state comes from `parseFragment()`
- Vue decides how to render it

## 5. Render Markdown as Vue nodes

For custom rendering, do not treat Markdown as already-rendered HTML.

Instead:

- parse it into nodes
- render those nodes through Vue components

The smallest helpers look like this:

```ts
function renderInlineNodes(nodes: MarkdownInlineNode[]): VNodeChild[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return h("strong", renderInlineNodes(node.children));
      case "link":
        return h("a", { href: node.href }, renderInlineNodes(node.children));
    }
  });
}

function renderBlockNodes(nodes: MarkdownBlockNode[]): VNodeChild[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "heading":
        return h("h2", renderInlineNodes(node.children));
      case "paragraph":
        return h("p", renderInlineNodes(node.children));
      case "list":
        return h("ul", node.items.map((item) => h("li", renderBlockNodes(item))));
    }
  });
}
```

This keeps the roles clear:

- MDSN parses the page model
- Vue decides the final component tree

## 6. Implement the block as a Vue component

The guestbook block becomes a Vue component that is responsible for:

- showing the fragment content
- editing `nickname`
- editing `message`
- calling `refresh`
- calling `submit`

The target lookup is the same as in the React version:

```ts
function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) return null;
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}
```

And action calls follow the same HTTP contract:

```ts
async function callMarkdownAction(
  method: "GET" | "POST",
  target: string,
  inputs: Record<string, unknown>,
) {
  const response = await fetch(target, {
    method,
    headers: {
      "content-type": "text/markdown",
      Accept: "text/markdown",
    },
    body:
      method === "POST"
        ? Object.entries(inputs)
          .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
          .join("\n")
        : undefined,
  });

  return await response.text();
}
```

## 7. Vue owns the final page layout

Once you have:

- `page.segments`
- `fragment.block`
- parsed Markdown nodes

Vue can decide:

- where static copy should appear
- where the block panel should appear
- which components wrap the content
- how the inputs and controls should look

That is the point of the headless path:

- MDSN defines the interaction structure
- Vue defines the interface

## Related pages

- [Server Development](/docs/server-development)
- [SDK Reference](/docs/sdk-reference)
- [Custom Rendering with React](/docs/react-rendering)
