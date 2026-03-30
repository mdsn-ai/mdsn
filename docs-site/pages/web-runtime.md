# Web Runtime

`@mdsn/web` is the browser-side headless host. It consumes host-rendered HTML bootstrap data, manages requests, and exposes page/block state to any renderer.

## Headless Usage

```ts
import { createHeadlessHost } from "@mdsn/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
host.mount();

host.subscribe((snapshot) => {
  console.log(snapshot.route, snapshot.blocks);
});
```

这是浏览器侧唯一推荐的 runtime 主线：

- 默认 UI：`createHeadlessHost()` + `mountMdsnElements()`
- 框架 UI：`createHeadlessHost()` + Vue/React/Svelte 自己渲染

框架接管 UI 时，推荐直接使用这套接口：

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`

## What It Does

After mounting, the host will:

- read the initial bootstrap snapshot from the current HTML page
- send `GET` and `POST` actions in the correct MDSN wire format
- merge block fragment responses into the current snapshot
- load a new page snapshot when the response includes an explicit continue target
- notify any renderer through `subscribe(listener)`

## Runtime State

The headless host exposes a tiny state API:

```ts
host.subscribe((snapshot) => {
  console.log(snapshot.status);
});
```

Current states are:

- `idle`
- `loading`
- `error`

## Typical Pairings

Use `createHeadlessHost()` together with `mountMdsnElements()` from `@mdsn/elements` if you want the default official UI.

Use `createHeadlessHost()` when you want the browser to keep the protocol/runtime, but the framework to own page/block rendering.
