---
title: Action Reference
description: Targets, action files, return values, and the HTTP contract
layout: docs
---

# Action Reference

Actions are the server-side execution layer for page `read` and `write`.

This page answers three questions:

- how a declared target maps to a server handler
- what an action file should return
- how the HTTP contract works

## 1. The most important rule

The target declared in the page is the directly callable HTTP address.

For example:

- `read refresh: "/list"`
- `write submit: "/post" (message)`

These become:

- `POST /list`
- `POST /post`

This is not an internal runtime path. It is the target written in the page itself.

## 2. Where action files live

By default, put action files under:

- `server/`

Supported file extensions:

- `.js`
- `.mjs`
- `.cjs`

The most common starter shape is:

- `server/actions.cjs`

For example:

- `server/actions.cjs` exporting `list`
  - maps to `POST /list`
- `server/actions.cjs` exporting `post`
  - maps to `POST /post`

If you split by folders, this also works:

- `server/posts/create.mjs`
  - maps to `POST /posts/create`

## 3. `defineAction()` and `defineActions()`

### `defineAction()`

```ts
export default defineAction({
  async run(ctx) {
    return "# Updated block";
  },
});
```

### `defineActions()`

```ts
module.exports = defineActions({
  list: defineAction({
    async run() {
      return "# List";
    },
  }),
  post: defineAction({
    async run(ctx) {
      return "# Post";
    },
  }),
});
```

For starter projects, `defineActions()` is usually the better default because it keeps file count low.

## 4. What `ActionContext` contains

Most commonly used fields:

- `inputs`
- `params`
- `query`
- `pathname`
- `request`
- `cookies`
- `env`
- `site`

The ones you will use most often are:

- `inputs`
- `pathname`
- `cookies`

## 5. Successful return values

Successful returns have two main forms:

1. a Markdown fragment string
2. a redirect result

A redirect result looks like this:

```ts
{ ok: true, kind: "redirect", location: string }
```

When an action returns a Markdown fragment string:

- the Host replaces the current `mdsn:block` region
- the fragment may contain normal Markdown
- the fragment may contain at most one executable `mdsn` code block

## 6. Failure return value

```ts
{
  ok: false,
  errorCode: string,
  message?: string,
  fieldErrors?: Record<string, string>
}
```

The page runtime reads these fields first:

- `message`
- `errorCode`
- `fieldErrors`

## 7. HTTP contract

In HTTP Host:

- `read` uses `POST`
- `write` uses `POST`

Request rules:

- preferred: `Content-Type: text/markdown`
- preferred body format (Markdown key-value lines):
  - `nickname: "Guest"`
  - `message: "Hello"`
- compatibility mode: `Content-Type: application/json`
- compatibility body format: `{ "inputs": { ... } }`

Successful responses:

- `Accept: text/markdown`
  - `200 text/markdown`
  - body is the new `md` fragment
- `Accept: application/json`
  - `200 application/json`
  - this form exists for Host runtime use

Failure responses:

- `400 application/json`
- `{ ok: false, errorCode, message?, fieldErrors? }`

## 8. Server-side Markdown helpers

`@mdsnai/sdk/server` exposes three common helpers:

- `renderMarkdownValue(type, value)`
- `serializeBlock(block)`
- `renderMarkdownFragment({ body, block })`

Example:

```js
const {
  defineAction,
  renderMarkdownFragment,
  renderMarkdownValue,
} = require("@mdsnai/sdk/server");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

module.exports = defineAction({
  async run() {
    return renderMarkdownFragment({
      body: [
        "## Messages",
        renderMarkdownValue("list", ["**Agent**: Hello"]),
      ],
      block: guestbookBlock,
    });
  },
});
```

## Related pages

- [Getting Started](/docs/getting-started)
- [Server Development](/docs/server-development)
- [HTTP Content Negotiation and Shared Interaction](/docs/shared-interaction)
