# API Reference

这份文档只覆盖当前 SDK 包根入口真正对外暴露的 API。

如果某个能力没有出现在这里，就不应该被当成公共 SDK 接口依赖。

## `@mdsnai/sdk/core`

推荐把 `@mdsnai/sdk/core` 理解成“协议对象层”。

### `parsePage(source)`

解析 canonical `.md` 页面源，返回页面对象。

```ts
import { parsePage } from "@mdsnai/sdk/core";

const page = parsePage(source);
```

适合：

- 只想做协议解析
- 想自己决定什么时候组合运行时 block 内容

### `composePage(source, { blocks })`

解析页面并附加运行时 block 内容，返回 composed page。

```ts
import { composePage } from "@mdsnai/sdk/core";

const page = composePage(source, {
  blocks: {
    guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
  }
});
```

返回值额外提供：

- `page.fragment(blockName)`

例如：

```ts
const fragment = page.fragment("guestbook");
```

这是当前推荐的 block 片段提取方式。

### `validatePage(page)`

校验页面结构：

- block 名称
- anchor 对齐
- input 引用
- operation 约束

```ts
import { parsePage, validatePage } from "@mdsnai/sdk/core";

const page = validatePage(parsePage(source));
```

### `parseMarkdownBody(body)`

解析 `POST` body 的 canonical Markdown 形式。

```ts
import { parseMarkdownBody } from "@mdsnai/sdk/core";

parseMarkdownBody('nickname: "Guest", message: "Hello"');
```

### `serializeMarkdownBody(values)`

把字段序列化成 canonical Markdown body：

```ts
import { serializeMarkdownBody } from "@mdsnai/sdk/core";

serializeMarkdownBody({ nickname: "Guest", message: "Hello" });
```

输出：

```md
nickname: "Guest", message: "Hello"
```

### `serializePage(page)`

把完整页面对象序列化为完整页面 Markdown。

### `serializeFragment(fragment)`

把 block 级片段序列化为 Markdown 片段。

### `MdsnMarkdownRenderer`

统一的 Markdown 渲染扩展接口。

```ts
interface MdsnMarkdownRenderer {
  render(markdown: string): string;
}
```

同一个 renderer 对象可以同时注入给：

- `createMdsnServer({ markdownRenderer })`
- `createHostedApp({ markdownRenderer })`
- `mountMdsnElements({ markdownRenderer })`

### `negotiateRepresentation(acceptHeader)`

根据 `Accept` 协商：

- `event-stream`
- `markdown`
- `html`
- `not-acceptable`

显式包含 `text/markdown` 时优先返回 `markdown`。

## `@mdsnai/sdk/server`

推荐把 `@mdsnai/sdk/server` 理解成“运行时 + Node host”。

### `createHostedApp({ pages, actions, ...options })`

创建一个更紧凑的 hosted app 入口。

```ts
import { createHostedApp } from "@mdsnai/sdk/server";

const app = createHostedApp({
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
```

每个 action 都要显式声明：

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

每个 action 会自动拿到：

- `routePath`
- `blockName`
- `page()`
- `block()`

### `createMdsnServer(options?)`

创建服务端 runtime。

```ts
import { createMdsnServer } from "@mdsnai/sdk/server";

const server = createMdsnServer();
```

可选项：

- `session`
- `renderHtml`
- `markdownRenderer`

创建后可注册：

- `server.page(path, handler)`
- `server.get(path, handler)`
- `server.post(path, handler)`
- `server.handle(request)`

### `block(page, blockName, result?)`

把 composed page 的某个 block 直接包装成成功 action result。

```ts
import { block } from "@mdsnai/sdk/server";

return block(page, "guestbook");
```

可选第三个参数可继续附加：

- `status`
- `headers`
- `session`

### `stream(asyncIterable, result?)`

把一个异步片段流包装成 `text/event-stream` 响应。

```ts
import { stream } from "@mdsnai/sdk/server";

return stream(
  (async function* () {
    yield { markdown: "## Tick", blocks: [] };
  })()
);
```

### `ok(result)`

构造成功 action result。适合你需要完全手写 fragment 时使用。

### `fail(result)`

构造失败 action result。适合需要显式设置 4xx/5xx 状态且仍返回 `md + mdsn` 片段时使用。

### `createNodeHost(server, options?)`

当前唯一推荐的 Node `http` 入口。

```ts
import http from "node:http";
import { createNodeHost } from "@mdsnai/sdk/server";

http.createServer(
  createNodeHost(server, {
    rootRedirect: "/guestbook"
  })
);
```

支持：

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`

它会同时负责：

- Node request -> neutral request bridge
- form body 归一化
- cookie 透传
- 静态文件壳
- 其它请求转发给 `server.handle()`

### `signIn(session)`

创建登录 session mutation。

### `signOut()`

创建登出 session mutation。

### `refreshSession(session)`

创建续期 session mutation。

### 公开类型

包根入口当前保留这些类型：

- `MdsnRequest`
- `MdsnResponse`
- `MdsnSessionSnapshot`
- `MdsnSessionMutation`
- `MdsnSessionProvider`
- `MdsnActionResult`
- `MdsnHandler`
- `MdsnHandlerContext`
- `MdsnHandlerResult`
- `MdsnPageHandler`

## `@mdsnai/sdk/web`

推荐把 `@mdsnai/sdk/web` 理解成“浏览器协议运行时”。

### `createHeadlessHost({ root, fetchImpl })`

框架接管 UI 时的推荐入口。它消费 server 注入到 HTML 里的 bootstrap 数据，并把当前 page/block 状态暴露给 Vue、React、Svelte 之类的宿主。

```ts
import { createHeadlessHost } from "@mdsnai/sdk/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
host.mount();
```

返回对象提供：

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`
- `host.mount()`
- `host.unmount()`

`snapshot` 当前至少包含：

- `route`
- `status`
- `error`
- `markdown`
- `blocks`

## `@mdsnai/sdk/elements`

推荐把 `@mdsnai/sdk/elements` 理解成“默认 UI 渲染器 + 自定义元素注册器”。

### `mountMdsnElements({ root, host, markdownRenderer? })`

默认 UI 的推荐入口。它会：

- 注册官方 Web Components
- 基于 snapshot 渲染默认 page/block/form UI

```ts
import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host
}).mount();
```

### `registerMdsnElements()`

```ts
import { registerMdsnElements } from "@mdsnai/sdk/elements";

registerMdsnElements();
```

会注册默认的 Web Components：

- `mdsn-page`
- `mdsn-block`
- `mdsn-form`
- `mdsn-field`
- `mdsn-action`
- `mdsn-error`

## 不再推荐依赖的旧路径

这些能力仍可能存在于包内部文件里，但不应该再作为公共 SDK 边界依赖：

- `fragmentForBlock()` 包根调用
- `createNodeRequestListener()` 包根调用
- `renderHtmlDocument()` 包根调用
- `@mdsnai/sdk/elements/register` 子路径
