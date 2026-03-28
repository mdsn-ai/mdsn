---
title: Action 参考
description: read/write target、action 文件组织、返回值与 HTTP 契约
layout: docs
---

# Action 参考

Action 是页面里 `read` / `write` 的服务端承接层。

这篇文档主要回答：

- 页面里写的 target 怎么落到服务端文件
- 一个 action 文件应该返回什么
- HTTP 契约怎么接

## 1. 先记住最重要的事实

页面里声明的 target，就是可直接调用的 HTTP 地址。

例如：

- `GET "/list" -> refresh`
- `POST "/post" (message) -> submit`

对应的就是：

- `GET /list`
- `POST /post`

这不是内部映射路径，也不是额外包装规则，就是页面里写出来的 target 本身。

## 2. action 文件放哪里

默认放在：

- `server/`

支持的文件扩展名：

- `.js`
- `.mjs`
- `.cjs`

最常见的 starter 结构是：

- `server/actions.cjs`

例如：

- `server/actions.cjs` 导出 `list`
  - 对应 `GET /list`
- `server/actions.cjs` 导出 `post`
  - 对应 `POST /post`

如果按目录拆开，也可以是：

- `server/posts/create.mjs`
  - 对应 `POST /posts/create`

## 3. `defineAction()` 和 `defineActions()`

### `defineAction()`

适合单个 action 文件：

```ts
export default defineAction({
  async run(ctx) {
    return "# Updated block";
  },
});
```

### `defineActions()`

适合一个文件里放多个 action：

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

对 starter 项目来说，通常优先用：

- `defineActions()`

这样文件数更少。

## 4. `ActionContext` 里有什么

最常见字段：

- `inputs`
- `params`
- `query`
- `pathname`
- `request`
- `cookies`
- `env`
- `site`

其中最常用的是：

- `inputs`
- `pathname`
- `cookies`

## 5. 成功返回什么

action 成功返回统一使用 Markdown fragment 字符串。

Markdown fragment 成功返回时：

- Host 替换当前 `mdsn:block` 区域
- 返回片段可以包含普通 Markdown
- 返回片段至多包含一个可执行 `mdsn` 代码块

## 6. action 不能继续时返回什么

直接返回一个 Markdown fragment，明确写清：

- 当前问题是什么
- 下一步该做什么
- 下一步对应哪个操作（通过 block 内动作声明）

## 7. HTTP 契约

在 HTTP Host 中：

- `read` 使用 `GET`
- `write` 使用 `POST`

请求规则：

- `Content-Type: text/markdown`
- 请求体（Markdown 键值行）：
  - `nickname: "Guest"`
  - `message: "Hello"`

action 响应：

- `200 text/markdown`
- 响应体是新的 `md` 片段

协议/运行时错误（例如 action 路由不存在、content-type 错误、未捕获异常）会返回 4xx/5xx，并同样给出 Markdown 提示。

## 8. 服务端 Markdown helper

`@mdsnai/sdk/server` 最常用的三个 helper 是：

- `renderMarkdownValue(type, value)`
- `serializeBlock(block)`
- `renderMarkdownFragment({ body, block })`

最常见用法是：

- 先把数据转成 Markdown
- 再把 Markdown 正文和 block 拼成最终 fragment

例如：

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

## 相关页面

- [快速开始](/zh/docs/getting-started)
- [服务端开发](/zh/docs/server-development)
- [HTTP 内容协商与共享交互](/zh/docs/shared-interaction)
