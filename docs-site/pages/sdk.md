# SDK Overview

`MDSN` 是一套以 Markdown 为协议真身的交互式页面 SDK。

如果只记一件事，可以记这个：

- 页面路由返回完整页面 Markdown
- `BLOCK` action 默认返回该 block 的 Markdown 片段
- agent 拿 Markdown
- browser 拿 Web Host 渲染后的 HTML

## 1. 包边界

第一期 SDK 固定为 4 个包：

- `@mdsn/core`
- `@mdsn/server`
- `@mdsn/web`
- `@mdsn/elements`

职责分工：

- `@mdsn/core`
  - 解析 `.md` 页面源
  - 校验 `BLOCK / INPUT / GET / POST`
  - 序列化 page / fragment
  - 提供 `composePage()`
- `@mdsn/server`
  - 注册 `page()` / `get()` / `post()`
  - 提供 `createHostedApp({ pages, actions })`
  - 协商 `text/markdown` 和 `text/html`
  - 协商 `text/event-stream`
  - 解析 query 和 Markdown body
  - 桥接 Node `http`
  - 校验 `POST` write media type
  - 向 session provider 透传 request cookies
- `@mdsn/web`
  - 提供 headless browser host
  - 读取 host 注入到 HTML 里的 bootstrap
  - 暴露 `snapshot / submit / visit / subscribe`
  - 作为默认 UI 和框架 UI 的共同浏览器底座
- `@mdsn/elements`
  - 提供官方默认 Web Components UI
  - 不重新定义协议
  - 可注入 `markdownRenderer`

依赖方向：

- `core <- server`
- `core <- web`
- `web <- elements`

## 2. 协议边界

协议边界永远是 Markdown：

- SDK 内部可以使用结构化对象
- 一到协议边界，传输的就是 `md` 或 `md + mdsn`
- 不额外包 JSON envelope
- 不额外增加结果类型字段

这意味着：

- `@mdsn/core` 内部可以有 `MdsnPage`、`MdsnFragment`
- agent 与 host 之间交换的是 Markdown
- browser 不直接消费 Markdown 协议，而是消费 host 渲染后的 HTML

## 3. 两种响应

### 页面响应

页面响应用于 page route，例如：

- `GET /guestbook`

返回的是完整页面 Markdown。

它通常来自 canonical `.md` 页面源，加上运行时 block 内容之后再序列化。

### Block 响应

block 响应用于 `BLOCK` 内定义的普通 `GET/POST` action，例如：

- `GET /list`
- `POST /post`

默认只返回当前 block 的 Markdown 片段。

这份片段里仍然应该包含该 block 继续工作所需的 `mdsn` 定义。

## 4. 两条消费链

### Agent 链

1. agent 请求 page route
2. server 返回完整 page markdown
3. agent 读出 block 定义和 target
4. agent 调用某个 block action
5. server 返回 block markdown fragment
6. agent 继续基于该 fragment 决策下一步

### Browser 链

1. browser 请求 page route
2. host 返回渲染后的 HTML
3. `@mdsn/web` 从 HTML bootstrap 建立当前 snapshot
4. UI 层调用 `submit()` 或 `visit()`
5. host 返回 HTML
6. `@mdsn/web` 更新当前 block 或整个 page snapshot

## 5. 推荐写法

推荐的业务边界应该是：

- app 自己维护 canonical `.md` 文件
- app 自己维护业务状态
- app 自己生成每个 block 的当前 Markdown 内容
- SDK 负责把这些东西组合、传输、渲染

典型写法：

```ts
import { composePage } from "@mdsn/core";
import { createHostedApp, createNodeHost } from "@mdsn/server";

function renderPage(source: string, messages: string[]) {
  return composePage(source, {
    blocks: {
      guestbook: `## ${messages.length} live messages\n\n${messages.map((message) => `- ${message}`).join("\n")}`
    }
  });
}

const server = createHostedApp({
  pages: {
    "/guestbook": () => renderPage(source, messages)
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

http.createServer(createNodeHost(server, { rootRedirect: "/guestbook" }));
```

## 6. 易用 API

当前推荐优先使用这些 API：

- `parsePage(source)`
- `composePage(source, { blocks })`
- `composePage(source, { blocks }).fragment(blockName)`
- `parseMarkdownBody(body)`
- `serializeMarkdownBody(values)`
- `serializePage(page)`
- `serializeFragment(fragment)`
- `createMdsnServer()`
- `createMdsnServer({ markdownRenderer })`
- `createHostedApp({ pages, actions })`
  - `actions` 现在是显式列表：`target + methods + routePath + blockName + handler`
- `block(page, blockName)`
- `stream(asyncIterable)`
- `server.page(path, handler)`
- `server.get(path, handler)`
- `server.post(path, handler)`
- `createNodeHost(server, options)`
- `createHeadlessHost({ root, fetchImpl })`
  - 返回 `mount()` / `unmount()` / `subscribe()` / `getSnapshot()` / `submit()` / `visit()`
- `mountMdsnElements({ root, host })`
  - 默认 UI 的 headless 渲染入口
- `mountMdsnElements({ root, host, markdownRenderer })`
  - 默认 UI 可直接接第三方 Markdown 渲染器
- `registerMdsnElements()`
  - 低层自定义元素注册器，通常只在特殊接入或测试里单独使用

## 7. 不推荐的做法

这些做法现在不建议暴露给使用者作为主路径：

- 让业务代码自己直接改 `page.blockContent`
- 让业务代码自己拼 request bridge
- 让 browser 直接解析 Markdown 协议文本
- 让 action 默认返回整页 Markdown
- 把 demo 壳里的 import map / 静态资源分发当作 SDK API
- 继续依赖旧的 `fragmentForBlock()` 风格，而不是用 `page.fragment()`

## 8.1 Stream Read

`GET "/stream" accept:"text/event-stream"` 现在已经打通：

- agent 可直接消费 SSE，事件载荷是 Markdown 片段
- browser runtime 会订阅 stream，并在收到事件后刷新所属 block 的 HTML
- page route 本身不支持 `text/event-stream`，会返回 `406`
## 9. 官方示例边界

官方 guestbook 现在分成两层：

- [examples/guestbook/src/index.ts](/Users/hencoo/projects/mdsnv/examples/guestbook/src/index.ts)
  - 纯 SDK 用法
  - 只保留页面源、业务状态、handler
- [examples/guestbook/demo.mjs](/Users/hencoo/projects/mdsnv/examples/guestbook/demo.mjs)
  - 本地运行壳
  - 只处理 demo 静态资源和页面增强注入

如果别人要抄示例，应该优先抄前者，而不是后者。

如果别人只是想拿一个最小可运行模板，优先看：

- [examples/starter/src/index.ts](/Users/hencoo/projects/mdsnv/examples/starter/src/index.ts)
- [examples/starter/dev.mjs](/Users/hencoo/projects/mdsnv/examples/starter/dev.mjs)
- [examples/starter/README.md](/Users/hencoo/projects/mdsnv/examples/starter/README.md)

如果是从已发布包开始起一个新项目，推荐入口是：

```bash
npm create mdsn@latest my-app
```

它当前只生成一个最小 starter，目录形态是：

- `app/guestbook.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## 10. 文档顺序

建议阅读顺序：

1. 本文：[docs/sdk.md](/Users/hencoo/projects/mdsnv/docs/sdk.md)
2. API reference：[docs/api-reference.md](/Users/hencoo/projects/mdsnv/docs/api-reference.md)
3. Server runtime：[docs/server-runtime.md](/Users/hencoo/projects/mdsnv/docs/server-runtime.md)
4. Web runtime：[docs/web-runtime.md](/Users/hencoo/projects/mdsnv/docs/web-runtime.md)
5. Elements：[docs/elements.md](/Users/hencoo/projects/mdsnv/docs/elements.md)
6. Session provider：[docs/session-provider.md](/Users/hencoo/projects/mdsnv/docs/session-provider.md)
7. Examples：[docs/examples.md](/Users/hencoo/projects/mdsnv/docs/examples.md)
