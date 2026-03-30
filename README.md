# MDSN SDK

MDSN is a Markdown-native interaction protocol with a framework-agnostic server runtime, a headless browser host, and a default Web Components UI.

Page routes return full Markdown pages. Ordinary `BLOCK` actions return block-scoped `md + mdsn` fragments by default.

## What You Get

- `@mdsnai/sdk/core`: parse, validate, serialize, negotiate
- `@mdsnai/sdk/server`: target-first server runtime and session abstraction
- `@mdsnai/sdk/web`: headless browser host for page/block state and actions
- `@mdsnai/sdk/elements`: default headless-powered Web Components UI

## Quick Start

If you are trying the SDK from this repository, start with:

```bash
npm install
npm run build
```

Then pick one of the examples below.

If you are starting a fresh app from the published starter, use:

```bash
npm create mdsn@latest my-app
cd my-app
npm install
npm run build
npm start
```

That starter keeps the app shape intentionally small:

- `app/guestbook.md`
- `app/sdk/server.ts`
- `app/client.ts`
- `index.mjs`

Install the packages you need:

```bash
npm install @mdsnai/sdk
```

Compose a page from canonical Markdown, then return block fragments from actions:

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";

const source = await readFile("pages/guestbook.md", "utf8");

function renderPage(messages: string[]) {
  return composePage(source, {
    blocks: {
      guestbook: `## ${messages.length} live messages\n\n${messages.map((message) => `- ${message}`).join("\n")}`
    }
  });
}

const server = createHostedApp({
  pages: {
    "/guestbook": () => renderPage(messages)
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
        messages.push(inputs.message ?? "");
        return block();
      }
    }
  ]
});
```

Run it with the built-in Node host:

```ts
http.createServer(
  createNodeHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticMounts: [{ urlPrefix: "/sdk/", directory: join(repoRoot, "sdk") }]
  })
);
```

On the browser side, mount the default headless-powered UI:

```ts
import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host
}).mount();
```

If you do not want the default UI, keep `createHeadlessHost()` and render `snapshot.markdown` plus `snapshot.blocks` from Vue, React, or your own view layer instead.

## Package Guide

Use `@mdsnai/sdk/server` when you want the fastest path to a working host.

Use `@mdsnai/sdk/web` when you want block-local updates in the browser but plan to bring your own UI.

Use `@mdsnai/sdk/elements` when you want the official default UI on top of the same headless browser state that framework hosts can consume.

Use `@mdsnai/sdk/core` when you only need protocol parsing, validation, or serialization.

If you want to swap in a third-party Markdown renderer for browser HTML output, provide the same `markdownRenderer` object to both `@mdsnai/sdk/server` and `@mdsnai/sdk/elements`.

The intended boundary is:

- app code owns canonical `.md` page files and business state
- `@mdsnai/sdk/core` turns page source plus runtime block content into page/fragment objects
- `@mdsnai/sdk/server` owns negotiation, request parsing, and HTTP response writing
- `@mdsnai/sdk/web` and `@mdsnai/sdk/elements` own browser interaction and default presentation

For `POST` request bodies, the canonical markdown format is comma-separated key/value text such as:

```md
nickname: "Guest", message: "Hello"
```

`@mdsnai/sdk/server` now enforces `Content-Type: text/markdown` for direct `POST` action requests and returns `415` when callers send a different write media type. The built-in Node bridge normalizes browser form posts into that canonical body format and forwards incoming cookies to session providers.

For stream reads, declare `GET "/stream" accept:"text/event-stream"`. The server runtime can now return SSE with `stream(...)`, while the browser runtime uses that channel to trigger block-local refreshes.

## Starter

If you want the smallest runnable scaffold, start here:

- [examples/starter/README.md](/Users/hencoo/projects/mdsn/examples/starter/README.md)
- [examples/starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/starter/src/index.ts)
- [examples/starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/starter/dev.mjs)

If you want the same starter shape with a framework host that fully takes over UI from the headless browser bootstrap, see:

- [examples/vue-starter/README.md](/Users/hencoo/projects/mdsn/examples/vue-starter/README.md)
- [examples/vue-starter/src/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/src/client.ts)
- [examples/vue-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/vue-starter/dev.mjs)
- [examples/react-starter/README.md](/Users/hencoo/projects/mdsn/examples/react-starter/README.md)
- [examples/react-starter/src/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/src/client.tsx)
- [examples/react-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/react-starter/dev.mjs)

If you want the same starter business module hosted on Express, see:

- [examples/express-starter/README.md](/Users/hencoo/projects/mdsn/examples/express-starter/README.md)
- [examples/express-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/index.ts)
- [examples/express-starter/src/express-adapter.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/express-adapter.ts)
- [examples/express-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/express-starter/dev.mjs)

If you want to validate a docs website architecture before moving it to a top-level app, see:

- [examples/docs-site/README.md](/Users/hencoo/projects/mdsn/examples/docs-site/README.md)
- [examples/docs-site/src/index.ts](/Users/hencoo/projects/mdsn/examples/docs-site/src/index.ts)
- [examples/docs-site/dev.mjs](/Users/hencoo/projects/mdsn/examples/docs-site/dev.mjs)

If you want a concrete third-party Markdown renderer integration, see:

- [examples/marked-starter/README.md](/Users/hencoo/projects/mdsn/examples/marked-starter/README.md)
- [examples/marked-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/src/index.ts)
- [examples/marked-starter/src/client.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/src/client.ts)

## Docs

- SDK overview: [docs/sdk.md](/Users/hencoo/projects/mdsn/docs/sdk.md)
- API reference: [docs/api-reference.md](/Users/hencoo/projects/mdsn/docs/api-reference.md)
- Third-party Markdown renderer example: [docs/third-party-markdown-renderer.md](/Users/hencoo/projects/mdsn/docs/third-party-markdown-renderer.md)
- Server runtime: [docs/sdk/server-runtime.md](/Users/hencoo/projects/mdsn/docs/sdk/server-runtime.md)
- Web runtime: [docs/sdk/web-runtime.md](/Users/hencoo/projects/mdsn/docs/sdk/web-runtime.md)
- Elements: [docs/sdk/elements.md](/Users/hencoo/projects/mdsn/docs/sdk/elements.md)
- Session provider: [docs/session-provider.md](/Users/hencoo/projects/mdsn/docs/session-provider.md)
- Examples: [docs/examples.md](/Users/hencoo/projects/mdsn/docs/examples.md)
