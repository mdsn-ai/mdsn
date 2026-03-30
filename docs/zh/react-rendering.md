---
title: 使用 React 自定义渲染
description: 以 @mdsnai/sdk/web 作为运行时，用 React 完整接管 UI。
---

# 使用 React 自定义渲染

推荐模式：

1. `createHeadlessHost({ root, fetchImpl })`
2. `host.mount()`
3. 在 `useEffect` 订阅并清理
4. 从 snapshot 派生 React 视图

这样可以在不重写协议逻辑的前提下实现完全自定义 UI。
