---
title: 使用 React 自定义渲染
description: 基于 @mdsnai/sdk/web 的 headless API，用 React 渲染自己的 MDSN 页面
layout: docs
---

# 使用 React 自定义渲染

这篇教程对应仓库里的完整示例：

- `examples/react-guestbook/pages/index.md`
- `examples/react-guestbook/server/actions.ts`
- `examples/react-guestbook/client/main.tsx`
- `examples/react-guestbook/server.ts`

目标是把 MDSN 当成协议层来用：

- 页面和 action 仍然返回 Markdown
- 客户端不使用默认 renderer
- React 自己决定静态内容、block 面板、输入控件和按钮怎么渲染

## 1. 先理解分层

在这个模式下，职责分成三层：

1. 页面层
   - `pages/index.md` 定义静态正文和 `mdsn:block`
2. 服务端层
   - `server/actions.ts` 返回新的 Markdown fragment
3. React 客户端层
   - `client/main.tsx` 用 headless API 解析页面和 fragment
   - 再自己渲染 UI

对应使用的公开 API 只有两组：

- `@mdsnai/sdk/web`
  - `parsePage()`
  - `parseFragment()`
- `@mdsnai/sdk/server`
  - `defineActions()`
  - `renderMarkdownFragment()`
  - `renderMarkdownValue()`

## 2. 页面仍然是普通 MDSN 页面

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
  input nickname: text
  input message!: text
  read refresh: "/list"
  write submit: "/post" (nickname, message)
}
```
````

这里有两个重点：

- 静态正文还是 Markdown
- 动态区域只通过 `<!-- mdsn:block guestbook -->` 暴露

React 客户端后面就是围绕这个锚点，把 `guestbook` block 渲染成自己的组件。

## 3. 服务端 action 继续返回 Markdown fragment

`server/actions.ts` 里没有返回 JSON 结果视图，而是直接返回新的 Markdown 片段。

最关键的部分是：

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

function renderGuestbookFragment(): string {
  return renderMarkdownFragment({
    body: [
      "## Latest Messages",
      renderMarkdownValue("list", [
        "**Agent**: Hello",
      ]),
    ],
    block: guestbookBlock,
  });
}
```

这层做的事情是：

- 用 `renderMarkdownValue()` 把数据转成 Markdown
- 用 `renderMarkdownFragment()` 把正文和 block 拼成合法 fragment
- `list` 和 `post` 都返回这个 fragment

这样 React 客户端拿到的永远是：

- 页面 Markdown
- 或 action 返回的 Markdown fragment

## 4. React 客户端先解析，不直接渲染 HTML

`client/main.tsx` 里最核心的两行是：

```ts
import { parseFragment, parsePage } from "@mdsnai/sdk/web";

const page = parsePage(pageMarkdown);
const fragment = parseFragment(fragmentMarkdown);
```

这两个 API 的作用不同：

- `parsePage()`
  - 解析整页 Markdown
  - 返回 `segments`、`blocks`、`anchors`
- `parseFragment()`
  - 解析 action 返回的当前 block 片段
  - 返回 `containers` 和 `block`

这一步之后，React 拿到的是结构化结果，不是已经定死的 HTML。

## 5. 先把 Markdown 节点渲染成 React 组件

示例里没有直接走默认 renderer，而是自己写了两个组件：

- `MarkdownInlines`
- `MarkdownBlocks`

例如段落和标题的处理就是这种风格：

```tsx
function MarkdownBlocks({ nodes }: { nodes: MarkdownBlockNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}`;
        switch (node.type) {
          case "heading":
            return <h2 key={key}><MarkdownInlines nodes={node.children} /></h2>;
          case "paragraph":
            return <p key={key}><MarkdownInlines nodes={node.children} /></p>;
          case "list":
            return (
              <ul key={key}>
                {node.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <MarkdownBlocks nodes={item} />
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </>
  );
}
```

这一步的意义是：

- SDK 负责把 Markdown 解析成结构化节点
- React 负责决定这些节点怎么变成最终界面

如果你想换成设计系统里的 `Text`、`Heading`、`Card` 组件，也是在这里换。

## 6. 再把 block 做成自己的 React 面板

示例里的 `GuestbookBlock` 是一个完全自定义的 React 组件。

它做三件事：

1. 从 `page` 或 `fragment` 里拿当前 block 定义
2. 调用 `read refresh`
3. 调用 `write submit`

核心查 target 的逻辑是：

```tsx
function findTarget(block: BlockDefinition | undefined, kind: "read" | "write", name: string): string | null {
  if (!block) return null;
  if (kind === "read") {
    return block.reads.find((item) => item.name === name)?.target ?? null;
  }
  return block.writes.find((item) => item.name === name)?.target ?? null;
}
```

提交 action 时，示例直接按 HTTP 协议调用：

```tsx
async function postMarkdownAction(target: string, inputs: Record<string, unknown>): Promise<string | ActionFailure> {
  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "text/markdown",
      Accept: "text/markdown",
    },
    body: Object.entries(inputs)
      .map(([name, value]) => `${name}: ${JSON.stringify(value)}`)
      .join("\n"),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json() as ActionFailure;
  }

  return await response.text();
}
```

这里对应的就是当前协议：

- target 直接是可调用地址
- `read` / `write` 在 HTTP Host 中都使用 `POST`
- 成功时返回 `text/markdown`

## 7. 页面布局由 React 自己决定

示例里真正体现 headless 价值的是 `App()`：

```tsx
return (
  <main className="rg-shell">
    <div className="rg-layout">
      {page.segments.map((segment, index) => {
        if (segment.type === "container") {
          return (
            <section key={`${segment.type}-${index}`} className="rg-copy">
              <MarkdownBlocks nodes={segment.container.nodes} />
            </section>
          );
        }

        if (segment.anchor.name === "guestbook") {
          return (
            <div key={`${segment.type}-${index}`} className="rg-sidebar">
              <GuestbookBlock
                page={page}
                fragment={fragment}
                onFragment={setFragment}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  </main>
);
```

这里不是默认面板自动渲染，而是：

- `segment.type === "container"` 时，渲染静态 Markdown 容器
- `segment.anchor.name === "guestbook"` 时，把它放进自己的侧栏布局

这就是 React 自定义渲染的核心价值：

- 静态正文怎么排版，你决定
- block 放左边、右边、底部还是浮层，你决定
- 输入框、按钮、错误提示和状态条长什么样，你决定

## 8. 启动顺序

这个 demo 不是 framework 默认页，而是一个自定义 server：

- `server.ts` 负责提供页面和 action 路由
- `client/main.tsx` 负责 React 渲染

启动命令：

```bash
npm run -w @mdsn/examples react-guestbook:start
```

默认地址：

```text
http://localhost:4025/
```

## 9. 什么时候应该用这种模式

适合用 React headless 渲染的情况：

- 你已经有现成的 React 设计系统
- 你不想使用 SDK 默认 renderer
- 你需要把 block 放进更复杂的页面布局
- 你需要自己控制消息卡片、表单控件、错误提示和交互动效

如果你只是想最快跑通：

- 优先用 framework starter
- 或先看 `examples/guestbook/`

如果你要的是“协议层 + 自定义前端框架”：

- 这篇 React 接入方式就是推荐路径

## 相关页面

- [服务端开发](/zh/docs/server-development)
- [SDK 参考](/zh/docs/sdk-reference)
- [Action 参考](/zh/docs/action-reference)
