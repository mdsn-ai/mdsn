---
title: 开发者路线图
description: 第一次接触 MDSN 时，如何选择合适的开发路径
layout: docs
---

# 开发者路线图

如果你第一次接触 MDSN，先不要把所有参考页都看完。

先回答一个问题：

**你想怎么接入 MDSN？**

## 路径 A：先最快跑起来

适合你：

- 想先看到一个能跑的页面
- 暂时不想自己搭服务端
- 想沿用 starter 和内建 framework

先读：

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)

第一个 import：

```ts
import { createFrameworkApp, defineConfig } from "@mdsnai/sdk";
```

第一个成功标志：

- `npm run dev` 后能在 `http://localhost:3000/` 打开首页

## 路径 B：接到现有服务端

适合你：

- 已经有 Express、Hono、Fastify、Koa
- 想自己控制路由、cookie、session、鉴权
- 只把页面和 action 协议接到现有系统里

先读：

- [服务端开发](/zh/docs/server-development)
- [Action 参考](/zh/docs/action-reference)

第一个 import：

```ts
import { createHostedApp, defineActions, renderMarkdownFragment } from "@mdsnai/sdk";
```

第一个成功标志：

- 你的服务端能同时返回页面 HTML 和 action Markdown fragment

## 路径 C：自己渲染前端

适合你：

- 想保留 MDSN 作为页面和 action 协议
- 但页面界面由 React 或 Vue 自己渲染
- 想自己决定 block、输入区和控件的 UI

先读：

- [使用 React 自定义渲染](/zh/docs/react-rendering)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [SDK 参考](/zh/docs/sdk-reference)

第一个 import：

```ts
import { parsePage, parseFragment, parseMarkdown } from "@mdsnai/sdk";
```

第一个成功标志：

- 你能把页面或片段解析成结构化结果，并在自己的组件里渲染出来

## 路径 D：只做协议解析

适合你：

- 只想解析页面定义
- 要做 lint、分析、静态校验、导出工具
- 不需要 host，也不需要默认 renderer

先读：

- [SDK 参考](/zh/docs/sdk-reference)

第一个 import：

```ts
import { parsePageDefinition } from "@mdsnai/sdk/core";
```

第一个成功标志：

- 你能从一个 `.md` 页面里拿到 frontmatter、正文和 `BLOCK` 定义

## 还不确定？

如果你还拿不准，默认先走：

- [快速开始](/zh/docs/getting-started)

这是最短、最稳的第一条路径。
