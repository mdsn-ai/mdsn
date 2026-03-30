# Elements

`@mdsn/elements` provides the default Lit-based UI for MDSN pages.

它现在也直接建立在 headless browser bootstrap 之上，而不再只是给 server 输出的原始 HTML 套样式。

推荐主线是 `mountMdsnElements({ root, host, ... })`。`registerMdsnElements()` 只是低层注册器，通常只在测试或特殊自定义接入里单独使用。

## Basic Usage

```ts
import { mountMdsnElements } from "@mdsn/elements";
import { createHeadlessHost } from "@mdsn/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host
}).mount();
```

如果你想接第三方 Markdown 渲染器，也可以把同一个 renderer 注入进来：

```ts
mountMdsnElements({
  root: document,
  host,
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  }
}).mount();
```

如果你只想注册这些自定义元素，也仍然可以单独调用 `registerMdsnElements()`。

默认会注册这些 custom elements：

- `mdsn-page`
- `mdsn-block`
- `mdsn-form`
- `mdsn-field`
- `mdsn-action`
- `mdsn-error`

## What This Package Is For

Use `@mdsn/elements` when you want:

- a better default UI than raw HTML
- Web Components that stay framework-neutral
- a thin official view layer on top of the same headless state model used by framework hosts

Use `@mdsn/web` without `@mdsn/elements` if you want a headless runtime and plan to render your own UI.
