---
title: 使用 Vue 自定义渲染
description: 以 @mdsnai/sdk/web 作为运行时，用 Vue 完整接管 UI。
---

# 使用 Vue 自定义渲染

推荐模式：

1. `createHeadlessHost({ root, fetchImpl })`
2. `host.mount()`
3. 订阅 snapshot
4. 在 Vue 中渲染 `snapshot.markdown` 与 `snapshot.blocks`

这样可以保留 MDSN 协议与运行时能力，同时完全接管视觉层。
