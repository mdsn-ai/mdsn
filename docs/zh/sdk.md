---
title: SDK 概览
description: MDSN SDK 的包结构、协议边界与推荐用法。
---

# SDK 概览

当前发布结构是：**一个包 + 多子路径导出**。

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

协议边界始终是 Markdown：

- 页面路由返回完整页面 Markdown
- block action 默认返回 block 片段 Markdown
- browser 侧通过 HTML + bootstrap 驱动 UI 更新

深入请看：

- [API 参考](/zh/docs/api-reference)
- [服务端运行时](/zh/docs/server-runtime)
- [Web 运行时](/zh/docs/web-runtime)
