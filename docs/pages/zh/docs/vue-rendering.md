---
title: 使用 Vue 自定义渲染
description: 基于 @mdsnai/sdk/web 的 headless API，用 Vue 渲染自己的 MDSN 页面
layout: docs
---

# 使用 Vue 自定义渲染

这篇教程讲最短的一条 Vue 接入路径：

- 页面和 action 继续使用 MDSN 协议
- 客户端不用默认 renderer
- Vue 自己渲染静态 Markdown、block 面板、输入框和按钮

为了把事情说清楚，这里用留言板做例子，不直接拿聊天 demo 当教程主线。

## 1. 目标结构

最小结构可以理解成三层：

1. 页面文件
   - `pages/index.md`
2. 服务端 action
   - `server/actions.ts` 或 `server/actions.cjs`
3. Vue 客户端
   - `client/main.ts`

其中：

- 页面定义静态正文和 `mdsn:block`
- action 返回新的 Markdown fragment
- Vue 客户端用 headless API 解析这些 Markdown，再自己渲染

## 2. 页面文件保持不变

`pages/index.md`：

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

This is a minimal runnable guestbook.

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

这里最重要的是两件事：

- `# Guestbook` 这一段仍然是普通 Markdown
- `<!-- mdsn:block guestbook -->` 是 Vue 后面要接管的动态区域

## 3. 服务端 action 返回 fragment

服务端不要返回结果视图 JSON，而是返回新的 Markdown 片段。

一个最小 `server/actions.ts` 可以写成：

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

function renderGuestbookFragment() {
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
      return renderGuestbookFragment();
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
      return renderGuestbookFragment();
    },
  }),
});
```

这里有三个核心 API：

- `renderMarkdownValue()`
  - 把数据转成 Markdown 文本
- `renderMarkdownFragment()`
  - 把正文和 block 拼成合法 fragment
- `defineActions()`
  - 一个文件里同时导出 `list` 和 `post`

## 4. Vue 客户端只做解析和渲染

客户端核心入口是：

```ts
import { parseFragment, parsePage } from "@mdsnai/sdk/web";
```

最小思路是：

1. 先请求整页 Markdown
2. `parsePage(pageMarkdown)`
3. 再请求一次 `/list`
4. `parseFragment(fragmentMarkdown)`
5. 用 Vue 组件自己渲染

例如：

```ts
const pageSource = ref("");
const fragment = ref<ParsedFragment | null>(null);

const page = computed(() => pageSource.value ? parsePage(pageSource.value) : null);

async function boot() {
  const pageResponse = await fetch("/page.md");
  pageSource.value = await pageResponse.text();

  const fragmentResponse = await callMarkdownAction("GET", "/list", {});
  if (typeof fragmentResponse === "string") {
    fragment.value = parseFragment(fragmentResponse);
  }
}
```

这样分层以后：

- 页面结构由 `parsePage()` 提供
- 当前 block 状态由 `parseFragment()` 提供
- Vue 只关心怎么把它们渲染成自己的组件

## 5. Markdown 不直接转 HTML，而是转成 Vue 节点

如果要自定义渲染，不要直接把 Markdown 当成现成 HTML 用。

更好的方式是：

- 用 `parsePage()` / `parseFragment()` 拿结构化节点
- 再自己渲染这些节点

最简单可以写两个 helper：

- `renderInlineNodes()`
- `renderBlockNodes()`

思路和现在的 Vue chat 示例一样：

```ts
function renderInlineNodes(nodes: MarkdownInlineNode[]): VNodeChild[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
        return h("strong", renderInlineNodes(node.children));
      case "link":
        return h("a", { href: node.href }, renderInlineNodes(node.children));
    }
  });
}

function renderBlockNodes(nodes: MarkdownBlockNode[]): VNodeChild[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "heading":
        return h("h2", renderInlineNodes(node.children));
      case "paragraph":
        return h("p", renderInlineNodes(node.children));
      case "list":
        return h("ul", node.items.map((item) => h("li", renderBlockNodes(item))));
    }
  });
}
```

这一步的意义是：

- MDSN SDK 负责解析
- Vue 负责决定最终组件长什么样

## 6. block 面板完全由 Vue 自己实现

留言板 block 最终就是一个 Vue 组件，负责：

- 展示 fragment 里的消息列表
- 输入 `nickname`
- 输入 `message`
- 调 `refresh`
- 调 `submit`

最关键的是查 block target：

```ts
function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) return null;
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}
```

然后按当前 HTTP 契约调用：

```ts
async function callMarkdownAction(
  method: "GET" | "POST",
  target: string,
  inputs: Record<string, unknown>,
) {
  const response = await fetch(target, {
    method,
    headers: {
      "content-type": "text/markdown",
      Accept: "text/markdown",
    },
    body:
      method === "POST"
        ? Object.entries(inputs)
          .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
          .join("\n")
        : undefined,
  });

  return await response.text();
}
```

这里对应的就是：

- target 直接是页面里声明的地址
- `read` 使用 `GET`
- `write` 使用 `POST`
- 成功响应是新的 Markdown fragment

## 7. 页面布局由 Vue 决定

真正体现 headless 价值的是：你可以自己决定静态正文和 block 怎么摆。

页面渲染时，一般会遍历 `page.segments`：

```ts
page.value?.segments.map((segment) => {
  if (segment.type === "container") {
    // 渲染静态 Markdown 容器
  }

  if (segment.type === "anchor" && segment.anchor.name === "guestbook") {
    // 渲染自己的 GuestbookBlock 组件
  }
});
```

这意味着：

- 静态正文可以放在左侧
- block 可以放在右侧
- 也可以放底部、弹层、标签页里

SDK 不再替你锁死布局。

## 8. 一个最小的 Vue guestbook 客户端长什么样

组合起来，核心只有这些状态：

- `pageSource`
- `fragment`
- `nickname`
- `message`
- `busy`
- `error`

流程是：

1. `boot()`
   - 取 `/page.md`
   - 取 `/list`
2. `refresh()`
   - `GET /list`
   - `parseFragment()`
3. `submit()`
   - `POST /post`
   - `parseFragment()`
   - 清空输入

如果你只是要一个简单的 Vue 自定义前端，这套已经够用了。

## 9. 什么时候应该用 Vue 自定义渲染

适合这种情况：

- 你已经有 Vue 组件系统
- 你不想使用 SDK 默认 renderer
- 你想自己决定 block 的布局和样式
- 你希望把 MDSN 当协议层，而不是 UI 框架

如果你还想看更复杂的 Vue 版本，可以再看：

- `examples/chat/`

它在这个基础上又加了：

- 登录页
- `GET`
- cookie session
- SSE 实时刷新
- 聊天气泡式布局

## 相关页面

- [服务端开发](/zh/docs/server-development)
- [使用 React 自定义渲染](/zh/docs/react-rendering)
- [SDK 参考](/zh/docs/sdk-reference)
- [Action 参考](/zh/docs/action-reference)
