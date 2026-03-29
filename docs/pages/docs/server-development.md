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

## Default Rule

Start with the root package:

```ts
import {
  createHostedApp,
  createActionContextFromRequest,
  defineActions,
  parseActionInputs,
  renderHostedPage,
  renderMarkdownFragment,
  renderMarkdownValue,
} from "@mdsnai/sdk";
```

For most custom server integrations, there are two tracks:

- use `createHostedApp()` when you want MDSN to carry the page/action HTTP glue for you
- use `renderHostedPage()` plus manual routes when you need full HTTP control

## 1. When this path makes sense

Choose this path when you already have your own server app, or when you need full control over:

- page routing
- sessions and cookies
- authentication
- asset loading
- frontend bundling and static file serving

In that case, you often do not need `@mdsnai/sdk/framework`.

In practice, start with:

- `@mdsnai/sdk`

Only move to child entry points when you want stricter package boundaries:

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/core`

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

## 3. Track A: use `createHostedApp()`

This is the simplest server-side path when you already have your own HTTP app but do not want to hand-wire every page and action route.

```ts
import express from "express";
import { readFile } from "node:fs/promises";
import { createHostedApp, defineAction, defineActions, renderMarkdownFragment } from "@mdsnai/sdk";

const app = createHostedApp({
  pages: {
    "/": await readFile("pages/index.md", "utf8"),
  },
  actions: defineActions({
    list: defineAction({
      async run() {
        return renderMarkdownFragment({
          body: ["## Messages", "_No messages yet._"],
          block: {
            name: "guestbook",
            reads: [{ name: "refresh", target: "/list" }],
          },
        });
      },
    }),
  }),
});

express().use(app);
```

Use this track when:

- you want custom server ownership
- you still want SDK-managed page/action wiring
- you do not need to hand-code every route

## 4. Track B: manual hosting and routing

No matter which framework you use, the flow is the same:

1. read page Markdown
2. decide whether to return `text/markdown` or `text/html`
3. map declared targets directly to HTTP routes
4. return Markdown fragments on successful actions
5. return error objects on failed actions

That means:

- MDSN still defines the page protocol
- your framework only carries it over HTTP

## 5. Serving pages manually

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

## 6. Wiring action routes manually

The most important rule for actions is:

- the target declared in the page is the directly callable HTTP address

If the page declares:

````mdsn-src
```mdsn
GET "/list" -> refresh
POST "/post" (nickname, message) -> submit
```
````

then your server should provide:

- `GET /list`
- `POST /post`

There is no hidden internal route here. The declared target is the route.

## 7. What handlers return

Action handlers return Markdown fragments.  
When the action cannot continue, return a Markdown fragment that explains the issue and the next step.

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
        return renderMarkdownFragment({
          body: [
            "## Action Status",
            "Please enter a message before submitting.",
          ],
          block: guestbookBlock,
        });
      }

      messages.unshift({ nickname, message });
      return renderGuestbook();
    },
  }),
});
```

## 8. HTTP action contract

The current HTTP Host contract is fixed:

- `read` uses `GET`
- `write` uses `POST`
- request body:
  - Markdown key-value lines (for example `message: "Hello"`)
- success response:
  - `200 text/markdown`
- action-level failure response:
  - still `200 text/markdown` (failure guidance is in Markdown body)
- auth/session challenge response:
  - usually `401 text/markdown` (with a login-guidance fragment)

In a custom server, the simplest path is to return the agent-facing Markdown contract directly:

```ts
app.get("/list", async (req, res) => {
  const markdown = await actions.list.run(createActionContextFromRequest(req, {
    pathname: "/list",
  }));
  res.status(200).type("text/markdown; charset=utf-8").send(markdown);
});

app.post("/post", async (req, res) => {
  const markdown = await actions.post.run(
    createActionContextFromRequest(req, {
      pathname: "/post",
      inputs: parseActionInputs(typeof req.body === "string" ? req.body : ""),
    }),
  );
  res.status(200).type("text/markdown; charset=utf-8").send(markdown);
});
```

Here, `createActionContextFromRequest()` is the public adapter from your framework request into `ActionContext`.

## 9. Session Runtime Contract (Cookie-Based)

Session handling is runtime behavior, not MDSN syntax.

Recommended flow:

1. login/register response sets cookie (`Set-Cookie`)
2. next requests replay cookie (`Cookie`)
3. when unauthorized, return `401 + Markdown guidance fragment`

`@mdsnai/sdk/server` provides helpers:

- `parseCookieHeader()`
- `requireSessionFromCookie()`
- `renderAuthRequiredFragment()`
- `HttpCookieJar` (for Node/agent HTTP loops)

## 9. The minimum `ActionContext`

The smallest commonly useful fields are:

- `inputs`
- `pathname`
- `request`
- `cookies`

Everything else can be layered on as needed.

## 10. Where the client fits

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
