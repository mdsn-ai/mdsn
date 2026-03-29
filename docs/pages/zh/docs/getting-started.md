---
title: 快速开始
description: 创建并运行第一个 MDSN 站点
layout: docs
---

# 快速开始

第一次上手时，先看懂一个最小页面，再跑 starter。

## 1. 先看一个最小页面

`pages/index.md`：

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

这是一个最小可运行的留言板页面。

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

你现在只需要看懂三件事：

- Markdown 正文还是普通页面内容
- `mdsn:block` 锚点标出运行时会被替换的区域
- `BLOCK guestbook { ... }` 定义输入和可调用动作

## 2. 再看它对应的最小 action 文件

`server/actions.cjs`：

```js
const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
} = require("@mdsnai/sdk");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderMarkdownFragment({
        body: ["## Messages", "_No messages yet._"],
        block: guestbookBlock,
      });
    },
  }),
});
```

这里也只要先记住一件事：

- action handler 返回的是 Markdown fragment，Host 会把它替换回当前 block 区域

## 3. 现在再创建站点

```bash
npm create mdsn@latest skills-app
cd skills-app
```

## 4. 起步结构

最小站点结构：

```text
package.json
pages/index.md
server/actions.cjs
```

最常用的是两个目录：

- `pages/`：页面 Markdown
- `server/`：action 文件

## 5. 补全服务端 action

`server/actions.cjs`：

```js
const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
} = require("@mdsnai/sdk");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

function getGuestbookStore() {
  if (!globalThis.__mdsnQuickstartGuestbookMessages) {
    globalThis.__mdsnQuickstartGuestbookMessages = [];
  }

  return globalThis.__mdsnQuickstartGuestbookMessages;
}

function listGuestbookMessages() {
  return getGuestbookStore().map((entry) => ({ ...entry }));
}

function renderGuestbookFragment(messages) {
  return renderMarkdownFragment({
    body: [
      "## Messages",
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

function addGuestbookMessage(message) {
  const store = getGuestbookStore();
  store.unshift({ nickname: message.nickname, message: message.message });
  return store[0];
}

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderGuestbookFragment(listGuestbookMessages());
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

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
});
```

## 6. 启动预览

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000/
```

## 7. 你现在已经有了什么

- 一个由 Markdown 页面驱动的站点
- 一个可被 `GET /list` 和 `POST /post` 这类 target 调用的 action 文件
- 一个可以返回 HTML 页面和 Markdown fragment 的默认 Host

## 8. 需要时再扩展

- 需要自定义站点配置时，再添加 `mdsn.config.cjs`
- 需要自定义页面壳时，再添加 `layouts/default.html`
- 需要静态资源目录时，再添加 `public/`

## 9. 常用命令

- 开发：`npm run dev`
- 构建：`npm run build`
- 预览：`npm run start`

## 接下来读什么

- 想继续沿用 starter 和 framework：读 [基础开发框架](/zh/docs/site-development)
- 想接到现有服务端：读 [服务端开发](/zh/docs/server-development)
- 想自己渲染前端：读 [开发者路线图](/zh/docs/developer-paths)

## 相关页面

- [Action 参考](/zh/docs/action-reference)
- [开发者路线图](/zh/docs/developer-paths)
- [SDK 参考](/zh/docs/sdk-reference)
- [基础开发框架](/zh/docs/site-development)

进阶验证可以直接看 `examples/chat/`：

- 登录页 -> `GET "/chat" -> enter_chat` -> 聊天页
- 登录后用 cookie 会话持续发言
- 多个 fresh agent 共享同一房间上下文
- 新的 fresh agent 可以只靠当前片段读取并总结聊天内容
