---
title: Server Development
description: Host MDSN pages and actions in Express, Hono, Fastify, and similar server frameworks
layout: docs
---

# Server Development

This page is about one thing:

- not using `@mdsnai/sdk/framework`
- wiring MDSN pages and actions directly into your own server framework

This applies to:

- Express
- Hono
- Fastify
- Koa
- any HTTP framework where you control routing and headers

## 1. When this path makes sense

Choose this path when you already have your own server app, or when you need full control over:

- page routing
- sessions and cookies
- authentication
- asset loading
- frontend bundling and static file serving

In that case, you often do not need `@mdsnai/sdk/framework`.

Instead, work directly with:

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`

## 2. Full reference demo

The repo already includes a full example for this path:

- [examples/react-guestbook/server.ts](/Users/hencoo/projects/mdsn/examples/react-guestbook/server.ts)
- [examples/react-guestbook/server/actions.ts](/Users/hencoo/projects/mdsn/examples/react-guestbook/server/actions.ts)
- [examples/react-guestbook/pages/index.md](/Users/hencoo/projects/mdsn/examples/react-guestbook/pages/index.md)

This demo does four things:

1. serves pages from a custom Express server
2. exposes `/list` and `/post` through custom routes
3. keeps the page and action model in MDSN
4. uses React headless APIs for client rendering

If you only care about the server side, this example is enough.

## 3. The minimal server chain

No matter which framework you use, the flow is the same:

1. read page Markdown
2. decide whether to return `text/markdown` or `text/html`
3. map declared targets directly to HTTP routes
4. return Markdown fragments on successful actions
5. return error objects on failed actions

That means:

- MDSN still defines the page protocol
- your framework only carries it over HTTP

## 4. Serving pages

The two most common public APIs here are:

```ts
import { parsePageDefinition } from "@mdsnai/sdk/core";
import { renderHostedPage, wantsHtml } from "@mdsnai/sdk/server";
```

Where:

- `parsePageDefinition()`
  - parses the page definition
- `wantsHtml()`
  - checks whether the current request wants HTML
- `renderHostedPage()`
  - returns `text/markdown` or `text/html` based on `Accept`

A minimal Express skeleton can look like this:

```ts
import express from "express";
import { readFile } from "node:fs/promises";
import { renderHostedPage } from "@mdsnai/sdk/server";

const app = express();
const pageMarkdown = await readFile("pages/index.md", "utf8");

app.get("/", (req, res) => {
  const response = renderHostedPage(pageMarkdown, {
    accept: req.headers.accept,
    routePath: "/",
    siteTitle: "Guestbook",
    siteDescription: "Custom hosted MDSN page",
  });

  res.status(response.status).type(response.contentType).send(response.body);
});
```

After this:

- `Accept: text/markdown` returns the original page Markdown
- `Accept: text/html` returns the hosted HTML page

## 5. Wiring action routes

The most important rule for actions is:

- the target declared in the page is the directly callable HTTP address

If the page declares:

````mdsn-src
```mdsn
read refresh: "/list"
write submit: "/post" (nickname, message)
```
````

then your server should provide:

- `POST /list`
- `POST /post`

There is no hidden internal route here. The declared target is the route.

## 6. What handlers return

Successful action returns have two main shapes:

1. a Markdown fragment string
2. a `redirect`

Failure returns are error objects.

You usually start with:

```ts
import { defineAction, defineActions } from "@mdsnai/sdk/server";
```

Example:

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

function renderGuestbook() {
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

export const actions = defineActions({
  list: defineAction({
    async run() {
      return renderGuestbook();
    },
  }),
  post: defineAction({
    async run(ctx) {
      const nickname = String(ctx.inputs.nickname ?? "").trim() || "Guest";
      const message = String(ctx.inputs.message ?? "").trim();

      if (!message) {
        return {
          ok: false,
          errorCode: "EMPTY_MESSAGE",
          fieldErrors: {
            message: "Please enter a message.",
          },
        };
      }

      messages.unshift({ nickname, message });
      return renderGuestbook();
    },
  }),
});
```

## 7. HTTP action contract

The current HTTP Host contract is fixed:

- `read` uses `POST`
- `write` uses `POST`
- request body (preferred):
  - Markdown key-value lines (for example `message: "Hello"`)
- JSON compatibility:
  - `{ "inputs": { ... } }`
- agent success response:
  - `200 text/markdown`
- Host runtime success response:
  - `200 application/json`
- failure response:
  - `400 application/json`

In a custom server, the simplest path is to return the agent-facing Markdown contract directly:

```ts
app.post("/list", async (req, res) => {
  const markdown = await actions.list.run(createActionContext("/list", {}, req));
  res.status(200).type("text/markdown; charset=utf-8").send(markdown);
});

app.post("/post", async (req, res) => {
  const result = await actions.post.run(
    createActionContext("/post", parseActionInputs(req.body), req),
  );

  if (typeof result === "string") {
    res.status(200).type("text/markdown; charset=utf-8").send(result);
    return;
  }

  res.status(400).json(result);
});
```

Here, `createActionContext()` is simply your adapter from the framework request into `ActionContext`.

## 8. The minimum `ActionContext`

The smallest commonly useful fields are:

- `inputs`
- `pathname`
- `request`
- `cookies`

Everything else can be layered on as needed.

## 9. Where the client fits

This page is about the server side only.

If you also want to own the client rendering layer:

- use `@mdsnai/sdk/web`
- parse the page with `parsePage()`
- parse action fragments with `parseFragment()`
- render your own components in React or Vue

## Related pages

- [Framework Development](/docs/site-development)
- [Action Reference](/docs/action-reference)
- [HTTP Content Negotiation and Shared Interaction](/docs/shared-interaction)
- [Custom Rendering with React](/docs/react-rendering)
