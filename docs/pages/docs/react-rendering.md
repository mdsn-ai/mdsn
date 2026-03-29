---
title: Custom Rendering with React
description: Use @mdsnai/sdk/web headless APIs and render your own MDSN UI in React
layout: docs
---

# Custom Rendering with React

This tutorial follows the complete example in the repo:

- `examples/react-guestbook/pages/index.md`
- `examples/react-guestbook/server/actions.ts`
- `examples/react-guestbook/client/main.tsx`
- `examples/react-guestbook/server.ts`

The goal is to use MDSN as a protocol layer for skills apps, agent apps, and interactive documents:

- pages and actions still return Markdown
- the client does not use the default renderer
- React decides how static content, block panels, inputs, and buttons should look

## 1. Understand the three layers

In this mode, responsibilities split into three layers:

1. page layer
   - `pages/index.md` defines static content and `mdsn:block`
2. server layer
   - `server/actions.ts` returns new Markdown fragments
3. React client layer
   - `client/main.tsx` parses pages and fragments through headless APIs
   - then renders its own UI

The public APIs you use most are:

- `@mdsnai/sdk/web`
  - `parsePage()`
  - `parseFragment()`
- `@mdsnai/sdk/server`
  - `defineActions()`
  - `renderMarkdownFragment()`
  - `renderMarkdownValue()`

## 2. The page is still a normal MDSN page

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

Two things matter here:

- the static body is still plain Markdown
- the dynamic region is exposed only through `<!-- mdsn:block guestbook -->`

## 3. Server actions still return Markdown fragments

`server/actions.ts` does not return a JSON view model. It returns a new Markdown fragment.

The key part looks like this:

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

function renderGuestbookFragment(): string {
  return renderMarkdownFragment({
    body: [
      "## Latest Messages",
      renderMarkdownValue("list", [
        "**Agent**: Hello",
      ]),
    ],
    block: guestbookBlock,
  });
}
```

This layer does three things:

- `renderMarkdownValue()` turns data into Markdown
- `renderMarkdownFragment()` joins body Markdown and block definition into a valid fragment
- both `list` and `post` return that fragment

## 4. Parse first, do not render fixed HTML

In `client/main.tsx`, the two key lines are:

```ts
import { parseFragment, parsePage } from "@mdsnai/sdk/web";

const page = parsePage(pageMarkdown);
const fragment = parseFragment(fragmentMarkdown);
```

These APIs do different jobs:

- `parsePage()`
  - parses the full page
  - returns `segments`, `blocks`, and `anchors`
- `parseFragment()`
  - parses the current block fragment
  - returns `containers` and `block`

After this step, React gets structure, not fixed HTML.

## 5. Render Markdown nodes as React components

The example does not use the default renderer. It defines its own components:

- `MarkdownInlines`
- `MarkdownBlocks`

That means:

- the SDK parses Markdown into structured nodes
- React decides how those nodes become UI

If you want to swap in design-system components, this is where you do it.

## 6. Implement the block as your own React panel

The example block component does three things:

1. reads the current block definition from the page or fragment
2. calls `read refresh`
3. calls `write submit`

The target lookup logic is straightforward:

```tsx
function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) return null;
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}
```

When it submits an action, it follows the current HTTP contract directly:

```tsx
async function callMarkdownAction(
  method: "GET" | "POST",
  target: string,
  inputs: Record<string, unknown>,
): Promise<string> {
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

## 7. React owns the page layout

Once you have the parsed page and fragment:

- static Markdown containers can be rendered where React wants them
- the block can be rendered into a custom panel
- the SDK defines the interaction model
- React defines the final interface

That means you can move the block into:

- a sidebar
- a card
- a design-system shell

without changing the page protocol.

## Related pages

- [Server Development](/docs/server-development)
- [SDK Reference](/docs/sdk-reference)
- [Custom Rendering with Vue](/docs/vue-rendering)
