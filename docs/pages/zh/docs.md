---
title: MDSN
description: MDSN 文档入口
layout: docs
---

# MDSN

MDSN 是一种面向交互式页面、skills apps 与 agent apps 的 Markdown 原生语言与参考实现。

如果你第一次接触 MDSN，最短的理解方式是：

**同一个页面源，同时定义页面内容和页面交互。**

先看一个最小页面：

````mdsn-src
# Guestbook

欢迎来到一个最小可运行的 MDSN 页面。

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

这个页面里最重要的三件事是：

- 普通 Markdown 继续负责页面内容
- `<!-- mdsn:block guestbook -->` 决定哪一块会在运行时被替换
- `BLOCK guestbook { ... }` 定义这个区域允许哪些输入和动作

在 MDSN 里，页面内容不只是展示内容，它同时也是提供给 Agent 的共享提示上下文。

这套模型尤其适合：

- 可同时给人和 AI agents 使用的 skills apps
- agent 可以直接进入并操作的 agent apps
- 带有嵌入式动作的 interactive documents
- human-agent collaboration、agentic workflows 和 AI workflow automation

## 从这里开始

如果你想先看懂一个最小例子再跑起来：

- [快速开始](/zh/docs/getting-started)
- [开发者路线图](/zh/docs/developer-paths)

如果你想先选择最适合自己的接入方式：

- [开发者路线图](/zh/docs/developer-paths)
- [基础开发框架](/zh/docs/site-development)
- [服务端开发](/zh/docs/server-development)

如果你想继续理解交互模型：

- [HTTP 内容协商与共享交互](/zh/docs/shared-interaction)
- [Agent App Demo 讲解](/zh/docs/agent-app-demo)
- [Action 参考](/zh/docs/action-reference)

如果你已经有自己的服务端或前端：

- [Agent App Demo 讲解](/zh/docs/agent-app-demo)
- [服务端开发](/zh/docs/server-development)
- [使用 React 自定义渲染](/zh/docs/react-rendering)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)

## 三个核心概念

### 1. 页面源

一个 MDSN 页面通常包含：

- frontmatter
- Markdown 正文
- 一个可执行的 `mdsn` 代码块

### 2. Block

`BLOCK` 是页面中的一个交互作用域。

它通过 `<!-- mdsn:block guestbook -->` 这样的锚点挂回 Markdown 正文，并在运行时成为可替换区域。

### 3. 片段更新

一次成功的 `read` 或 `write` 不会返回整页刷新结果，也不会返回任意 JSON 视图。它会返回一个新的 Markdown 片段，而 Host 只替换当前 block 区域。

## 选择开发路径

### 路径 A：使用内建 Framework 构建站点

适合你：

- 想快速开始
- 想直接使用 starter
- 暂时不想先搭自己的服务端

建议阅读：

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)

### 路径 B：在自己的服务端承载 MDSN

适合你已经有 Express、Hono、Fastify、Koa 或其他 HTTP 栈，并且希望自己控制路由、session、cookie、鉴权以及和现有系统的集成。

建议阅读：

- [服务端开发](/zh/docs/server-development)
- [Action 参考](/zh/docs/action-reference)
- [SDK 参考](/zh/docs/sdk-reference)

### 路径 C：使用自己的前端渲染

适合你想把 MDSN 保留为页面与 action 的协议层，但前端界面由 React 或 Vue 自己渲染。

建议阅读：

- [使用 React 自定义渲染](/zh/docs/react-rendering)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [SDK 参考](/zh/docs/sdk-reference)

## 参考

- [Action 参考](/zh/docs/action-reference)
- [配置参考](/zh/docs/config-reference)
- [CLI 参考](/zh/docs/cli-reference)
- [开发者路线图](/zh/docs/developer-paths)
- [SDK 参考](/zh/docs/sdk-reference)
