---
title: MDSN
description: MDSN 文档首页
---

# MDSN

MDSN 是一套面向交互式页面、skills apps 与 agent apps 的 Markdown 原生 SDK 运行时。

如果只记一句话，可以记这个：

**同一个页面源，同时定义页面内容和页面交互。**

在 MDSN 里：

- 页面内容仍然是 Markdown
- 动态区域通过 `mdsn:block` 锚点挂回正文
- `read` / `write` 成功后返回 Markdown 片段
- host 只替换当前 block 区域

## 从这里开始

- [SDK 概览](/zh/docs/sdk)
- [服务端运行时](/zh/docs/server-runtime)
- [Web 运行时](/zh/docs/web-runtime)

## 三个核心概念

### 1. 页面源

一个 MDSN 页面通常包含：

- frontmatter
- Markdown 正文
- 一个可执行的 `mdsn` 代码块

### 2. Block

`BLOCK` 是页面中的交互作用域。

它通过 `<!-- mdsn:block guestbook -->` 这样的锚点挂回正文，并在运行时成为可替换区域。

### 3. 片段更新

一次成功的 `read` 或 `write` 会返回新的 Markdown 片段，host 只替换当前 block 区域。

## 推荐阅读顺序

- [SDK 概览](/zh/docs/sdk)
- [API 参考](/zh/docs/api-reference)
- [Elements 组件](/zh/docs/elements)
- [Session Provider](/zh/docs/session-provider)
- [第三方渲染器](/zh/docs/third-party-markdown-renderer)
- [示例](/zh/docs/examples)
