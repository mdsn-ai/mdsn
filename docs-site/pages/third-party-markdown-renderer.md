# Third-Party Markdown Renderer

`MDSN` 现在支持通过同一个接口注入第三方 Markdown 渲染器：

```ts
interface MdsnMarkdownRenderer {
  render(markdown: string): string;
}
```

这意味着你可以把同一个 renderer 同时交给：

- `@mdsn/server`
- `@mdsn/elements`

这样 browser 的 HTML host 和默认 UI 会保持同一种 Markdown 呈现。

## Example: `marked`

```ts
import { marked } from "marked";
import { createHostedApp, createNodeHost } from "@mdsn/server";
import { createHeadlessHost } from "@mdsn/web";
import { mountMdsnElements } from "@mdsn/elements";

const markdownRenderer = {
  render(markdown: string) {
    return marked.parse(markdown) as string;
  }
};

const app = createHostedApp({
  markdownRenderer,
  pages: {
    "/guestbook": renderGuestbookPage
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

http.createServer(createNodeHost(app, { rootRedirect: "/guestbook" }));

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host,
  markdownRenderer
}).mount();
```

## When You Need This

适合这些情况：

- 你已经有现成的 Markdown 渲染器配置
- 你要支持更完整的 Markdown 语法
- 你希望 browser HTML host 和默认 UI 使用同一套渲染规则

## When You Don’t

如果你本来就打算用 Vue/React 完全接管 UI，其实不一定要走这层注入。

那种情况下更简单的做法通常是：

- `createHeadlessHost()`
- 在框架里直接拿 `snapshot.markdown` / `block.markdown`
- 用你自己的 Markdown renderer 渲染

也就是说：

- 默认 UI 链路：推荐用注入
- 框架接管 UI：直接在框架里渲染通常更自然
