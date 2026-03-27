---
title: 服务端开发
description: 不使用 @mdsnai/sdk/framework，直接用 Express、Hono、Fastify 这类服务端框架承载 MDSN 页面与 action
layout: docs
---

# 服务端开发

这篇文档只讲一件事：

- 不使用 `@mdsnai/sdk/framework`
- 直接把 MDSN 页面和 action 接到你自己的服务端框架里

适用的框架包括：

- Express
- Hono
- Fastify
- Koa
- 任何能自己处理路由和响应头的 HTTP 框架

## 1. 什么时候需要这条路

如果你已经有自己的服务端应用，或者你要自己控制：

- 页面路由
- session / cookie
- 鉴权
- 资源加载
- 前端打包和静态文件服务

那就不一定需要 `@mdsnai/sdk/framework`。

这时候更适合直接使用公开 SDK：

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`

## 2. 参考完整 demo

这条接入路径在仓库里已经有一份完整 demo：

- [examples/react-guestbook/server.ts](/Users/hencoo/projects/mdsn/examples/react-guestbook/server.ts)
- [examples/react-guestbook/server/actions.ts](/Users/hencoo/projects/mdsn/examples/react-guestbook/server/actions.ts)
- [examples/react-guestbook/pages/index.md](/Users/hencoo/projects/mdsn/examples/react-guestbook/pages/index.md)

这个 demo 做的是：

1. 用自定义 Express server 提供页面
2. 用自定义路由暴露 `/list` 和 `/post`
3. 页面和 action 都继续走 MDSN 协议
4. 前端再用 React headless API 自己渲染

如果你只关心服务端接入，这个 demo 已经足够完整。

## 3. 服务端接入的最小链路

不管你用什么框架，流程都一样：

1. 读取页面 Markdown
2. 决定返回 `text/markdown` 还是 `text/html`
3. 把页面里声明的 target 直接映射到 HTTP 路由
4. action 成功时返回 Markdown fragment
5. action 失败时返回错误对象

也就是说：

- 页面协议仍然是 MDSN
- 框架只负责 HTTP 承载

## 4. 页面响应怎么做

最常用的两个公开 API 是：

```ts
import { parsePageDefinition } from "@mdsnai/sdk/core";
import { renderHostedPage, wantsHtml } from "@mdsnai/sdk/server";
```

其中：

- `parsePageDefinition()`
  - 解析页面定义
- `wantsHtml()`
  - 判断当前请求是否需要 HTML
- `renderHostedPage()`
  - 根据 `Accept` 协商返回 `text/markdown` 或 `text/html`

一个最小 Express 骨架可以写成：

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

这样之后：

- `Accept: text/markdown` 会返回原始页面 Markdown
- `Accept: text/html` 会返回 HTML 页面

## 5. action 路由怎么做

action 这层最重要的事实是：

- 页面里声明的 target，就是可直接调用的 HTTP 地址

例如页面里如果写的是：

````mdsn-src
```mdsn
read refresh: "/list"
write submit: "/post" (nickname, message)
```
````

那你的服务端就应该提供：

- `POST /list`
- `POST /post`

这不是内部映射，也不是额外包装路径，就是页面里声明的 target 本身。

## 6. action handler 返回什么

action handler 的成功返回值只有两种主形态：

1. Markdown fragment 字符串
2. `redirect`

失败时返回错误对象。

可以直接用：

```ts
import { defineAction, defineActions } from "@mdsnai/sdk/server";
```

例如：

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

## 7. action HTTP 契约怎么接

当前 HTTP Host 契约是固定的：

- `read` / `write` 在 HTTP Host 中都使用 `POST`
- 请求体（推荐）：
  - Markdown 键值行（例如 `message: "Hello"`）
- JSON 兼容：
  - `{ "inputs": { ... } }`
- agent 成功响应：
  - `200 text/markdown`
- Host runtime 成功响应：
  - `200 application/json`
- 失败响应：
  - `400 application/json`

在自定义服务端里，最简单的做法就是直接按 agent 侧 Markdown 契约返回：

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

这里的 `createActionContext()` 只是把你的请求对象整理成 `ActionContext` 需要的字段。

## 8. `ActionContext` 最少要补什么

最小字段一般是这些：

```ts
import type { ActionContext } from "@mdsnai/sdk/server";

function createActionContext(
  pathname: string,
  inputs: Record<string, unknown>,
  request: unknown,
): ActionContext {
  return {
    inputs,
    params: {},
    query: new URLSearchParams(),
    pathname,
    request,
    cookies: {},
    env: {},
    site: {},
  };
}
```

如果你的服务端有更多能力，也可以往里补：

- `cookies`
- `env`
- `site`
- `params`
- `query`

登录、session、鉴权这些都可以在这层自己接。

## 9. `redirect` 怎么接

如果 action 返回的是：

```ts
{
  ok: true,
  kind: "redirect",
  location: "/chat",
}
```

那你的服务端只需要把它当成协议成功结果继续返回。

最常见的做法是：

- agent / API 客户端：
  - 返回 JSON，让调用方自己决定是否跟随
- 浏览器应用：
  - 客户端收到后再执行跳转

仓库里的 [examples/chat/server.ts](/Users/hencoo/projects/mdsn/examples/chat/server.ts) 就是这条链的完整参考：

- `/login`
- 设置 cookie session
- 返回 `redirect`
- 前端进入 `/chat`

## 10. 什么时候再加自定义前端

如果你只是要把页面协议挂到现有服务端里：

- 先把页面承载和 action 契约接通
- 不一定马上需要自定义 React / Vue

如果你还想自己掌控前端布局和组件：

- 再接 `@mdsnai/sdk/web` 的 headless API

对应参考：

- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [使用 React 自定义渲染](/zh/docs/react-rendering)

## 11. 总结

这条路的核心就是：

- MDSN 负责页面协议
- 你的服务端框架负责 HTTP 路由和上下文
- 页面继续返回 Markdown
- action 继续返回 Markdown fragment 或 `redirect`

只要你的框架能控制：

- 路由
- 请求头
- 响应头
- JSON body

就能把 MDSN 接进去。

## 相关页面

- [Action 参考](/zh/docs/action-reference)
- [SDK 参考](/zh/docs/sdk-reference)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [使用 React 自定义渲染](/zh/docs/react-rendering)
