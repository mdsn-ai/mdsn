# Server Runtime

`@mdsnai/sdk/server` is the main entry point for people who want to host MDSN on the server.

It is target-first, which means you register handlers by the actual HTTP path written in the MDSN operation.

## Basic Usage

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";

const server = createHostedApp({
  pages: {
    "/guestbook": pageHandler
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: listHandler
    },
    {
      target: "/post",
      methods: ["POST"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: postHandler
    }
  ]
});
```

## Handler Shape

Handlers receive a context object with:

- parsed inputs
- framework-neutral request metadata
- session snapshot

如果你直接使用 `createHostedApp()`，action handler 还会拿到：

- `routePath`
- `blockName`
- `page()`
- `block()`

最常见的 block action 可以直接写成：

```ts
const page = composePage(source, {
  blocks: {
    guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
  }
});

const server = createHostedApp({
  pages: {
    "/guestbook": () => page
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: ({ block }) => block()
    }
  ]
});
```

The runtime serializes that result into `md + mdsn`.

`createHostedApp()` 现在不再通过“匿名 session 先渲染一遍页面”去猜 action 绑定。`actions` 必须显式声明 `target / methods / routePath / blockName`，这样注册语义是稳定的，不会被页面可见状态偷偷影响。

Use `createHostedApp()` when your app is naturally “a set of pages plus actions”. Drop down to `createMdsnServer()` when you need full manual control.

## Request Bridge

If you want full control, your framework adapter only needs to call `server.handle()` with a neutral request shape:

```ts
const response = await server.handle({
  method: "POST",
  url: "https://example.com/login",
  headers: {
    accept: "text/markdown",
    "content-type": "text/markdown"
  },
  body: 'nickname: "guest", message: "hello"',
  cookies: {}
});
```

The returned object contains:

- `status`
- `headers`
- `body`

If you are on Node `http`, use the built-in host:

```ts
http.createServer(
  createNodeHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/starter/client.js": join(exampleRoot, "dist", "client.js")
    },
    staticMounts: [{ urlPrefix: "/sdk/", directory: join(repoRoot, "sdk") }]
  })
);
```

## Built-In Responsibilities

`@mdsnai/sdk/server` already handles:

- route matching by target
- GET query parsing
- POST Markdown body parsing
- `415 Unsupported Media Type` for non-Markdown direct POST writes
- recoverable `400` responses for malformed Markdown bodies
- Node `http` hosting when you use `createNodeHost()`
- cookie forwarding into `request.cookies`
- session injection
- Markdown vs HTML negotiation
- fragment serialization
- `text/event-stream` negotiation for stream reads
- 404 and 406 fallback responses

## Custom Markdown Renderer

当 browser 走 HTML host 链时，`@mdsnai/sdk/server` 会负责把 Markdown 渲染成 HTML。这个渲染能力现在支持注入：

```ts
const server = createHostedApp({
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  },
  pages,
  actions
});
```

如果你同时使用默认 `@mdsnai/sdk/elements` UI，建议把同一个 `markdownRenderer` 对象同时传给 `mountMdsnElements(...)`，这样 server 和默认 UI 的 Markdown 呈现会保持一致。

## When To Wrap It

If you later want Express, Hono, or Next support, build that as a thin adapter around `server.handle()` rather than forking the runtime logic.
