# SDK Overview

`@mdsnai/sdk` 是 MDSN 的官方 SDK 包。

如果只记一件事，可以记这个：

- 页面路由返回完整页面 Markdown
- `BLOCK` action 默认返回当前 block 的 Markdown 片段
- agent 侧消费 Markdown
- browser 侧消费 host 渲染后的 HTML（由 headless runtime 驱动）

## 1. 包结构（当前发布形态）

现在是**单包发布 + 子路径导出**，不是多个独立 npm 包：

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

也可以从 `@mdsnai/sdk` 根入口统一导入。

职责分工：

- `@mdsnai/sdk/core`
  - 解析 `.md` 页面源
  - 校验 `BLOCK / INPUT / GET / POST`
  - 序列化 page / fragment
  - 提供 `composePage()`
- `@mdsnai/sdk/server`
  - `createHostedApp({ pages, actions })`
  - 协商 `text/markdown` / `text/html` / `text/event-stream`
  - 解析 query 和 Markdown body
  - Node `http` bridge (`createNodeHost`)
  - `POST` write media type 校验
  - session provider cookie 透传
- `@mdsnai/sdk/web`
  - headless browser host
  - 读取 HTML bootstrap
  - 暴露 `snapshot / submit / visit / subscribe`
- `@mdsnai/sdk/elements`
  - 官方默认 Web Components UI
  - 基于同一套 headless runtime
  - 可注入 `markdownRenderer`

## 2. 协议边界

协议边界始终是 Markdown：

- SDK 内部可以用结构化对象
- 到边界传输的就是 `md` 或 `md + mdsn`
- 不额外包 JSON envelope

这意味着：

- `core` 内部可用 `MdsnPage`、`MdsnFragment`
- agent 与 host 交换的是 Markdown
- browser 不直接消费协议文本，而是消费 host 输出的 HTML + bootstrap 状态

## 3. 两种响应

### 页面响应

用于 page route（例如 `GET /guestbook`），返回完整页面 Markdown。

### Block 响应

用于 `BLOCK` 内定义的普通 `GET/POST` action（例如 `GET /list`、`POST /post`），默认返回当前 block Markdown 片段。

## 4. 两条消费链

### Agent 链

1. 请求 page route
2. 获取完整 page markdown
3. 解析 block 定义和 target
4. 调用 block action
5. 获取 block fragment
6. 基于 fragment 继续决策

### Browser 链

1. 请求 page route
2. host 返回 HTML
3. `@mdsnai/sdk/web` 从 bootstrap 建立 snapshot
4. UI 调用 `submit()` / `visit()`
5. host 返回 HTML
6. runtime 更新 block 或 page snapshot

## 5. 推荐写法

业务边界建议是：

- app 维护 canonical `.md` 文件
- app 维护业务状态
- app 生成每个 block 当前 Markdown
- SDK 负责组合、传输和渲染

典型写法：

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";

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

## 6. 常用 API

- `parsePage(source)`
- `composePage(source, { blocks })`
- `composePage(...).fragment(blockName)`
- `parseMarkdownBody(body)`
- `serializeMarkdownBody(values)`
- `serializePage(page)`
- `serializeFragment(fragment)`
- `createMdsnServer()`
- `createHostedApp({ pages, actions })`
- `block(page, blockName)`
- `stream(asyncIterable)`
- `createNodeHost(server, options)`
- `createHeadlessHost({ root, fetchImpl })`
- `mountMdsnElements({ root, host, markdownRenderer? })`
- `registerMdsnElements()`

## 7. Stream Read

`GET "/stream"` + `Accept: text/event-stream` 已支持：

- agent 可直接消费 SSE（事件载荷是 Markdown 片段）
- browser runtime 可订阅 stream 并触发 block 刷新
- page route 本身不支持 `text/event-stream`，会返回 `406`

## 8. 示例入口

- [examples/starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/starter/src/index.ts)
- [examples/starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/starter/dev.mjs)
- [examples/guestbook/src/index.ts](/Users/hencoo/projects/mdsn/examples/guestbook/src/index.ts)
- [examples/auth-session/src/index.ts](/Users/hencoo/projects/mdsn/examples/auth-session/src/index.ts)

## 9. 文档阅读顺序

1. [docs/sdk.md](/Users/hencoo/projects/mdsn/docs/sdk.md)
2. [docs/api-reference.md](/Users/hencoo/projects/mdsn/docs/api-reference.md)
3. [docs/server-runtime.md](/Users/hencoo/projects/mdsn/docs/server-runtime.md)
4. [docs/web-runtime.md](/Users/hencoo/projects/mdsn/docs/web-runtime.md)
5. [docs/elements.md](/Users/hencoo/projects/mdsn/docs/elements.md)
6. [docs/session-provider.md](/Users/hencoo/projects/mdsn/docs/session-provider.md)
7. [docs/examples.md](/Users/hencoo/projects/mdsn/docs/examples.md)
