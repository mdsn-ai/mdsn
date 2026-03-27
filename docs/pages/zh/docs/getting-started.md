---
title: 快速开始
description: 创建并运行第一个 MDSN 站点
layout: docs
---

# 快速开始

## 1. 创建站点

```bash
npm create mdsn@latest skills-app
cd skills-app
```

## 2. 起步结构

最小站点结构：

```text
package.json
pages/index.md
server/actions.cjs
```

最常用的是两个目录：

- `pages/`：页面 Markdown
- `server/`：action 文件

## 3. 添加留言板页面

`pages/index.md`：

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

这是一个最小可运行的留言板示例。

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  input nickname: text
  input message!: text
  read refresh: "/list"
  write submit: "/post" (nickname, message)
}
```
````

这页定义了：

- 一个静态 Markdown 页面正文
- 一个 `mdsn:block guestbook` 替换区域
- 一个 `block guestbook` 交互定义

## 4. 添加服务端 action

`server/actions.cjs`：

```js
const {
  defineAction,
  defineActions,
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
        return {
          ok: false,
          errorCode: "EMPTY_MESSAGE",
          fieldErrors: { message: "Please enter a message." },
        };
      }

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
});
```

## 5. 启动预览

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000/
```

## 6. 需要时再扩展

- 需要自定义站点配置时，再添加 `mdsn.config.cjs`
- 需要自定义页面壳时，再添加 `layouts/default.html`
- 需要静态资源目录时，再添加 `public/`
## 7. 常用命令

- 开发：`npm run dev`
- 构建：`npm run build`
- 预览：`npm run start`

## 相关页面

- [Action 参考](/zh/docs/action-reference)
- [SDK 参考](/zh/docs/sdk-reference)
- [基础开发框架](/zh/docs/site-development)

进阶验证可以直接看 `examples/chat/`：

- 登录页 -> `redirect` -> 聊天页
- 登录后用 cookie 会话持续发言
- 多个 fresh agent 共享同一房间上下文
- 新的 fresh agent 可以只靠当前片段读取并总结聊天内容
