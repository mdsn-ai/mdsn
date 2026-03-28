---
title: SDK 参考
description: 如何选择和使用 @mdsnai/sdk 的公开入口
layout: docs
---

# SDK 参考

`@mdsnai/sdk` 不是只有一组 API。

它提供了几条不同的使用路径：

- 直接用内建 framework 开发站点
- 在你自己的服务端里承载页面和 action
- 用 headless API 自己做 React / Vue 渲染
- 只做协议和页面结构解析

这页先回答：

- 什么时候该用哪一个入口
- 每个入口最重要的 API 是什么

最后再给出公开入口清单。

## 1. 先选路径

### 路径 A：直接开发一个站点

适合你：

- 想最快跑起来
- 不想先自己搭 server
- 想直接用 starter 和内建 framework

优先看：

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)

主要入口：

- `@mdsnai/sdk/framework`

最常用的 API：

- `createFrameworkApp()`
- `defineConfig()`

### 路径 B：自己接服务端

适合你：

- 已经有 Express / Hono / Fastify / Koa
- 想自己控制路由、cookie、session、鉴权
- 只把 MDSN 页面和 action 接到现有系统里

优先看：

- [服务端开发](/zh/docs/server-development)
- [SDK 错误提示片段](/zh/docs/sdk-error-fragments)

主要入口：

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/core`

最常用的 API：

- `renderHostedPage()`
- `defineAction()`
- `defineActions()`
- `renderMarkdownValue()`
- `renderMarkdownFragment()`
- `parsePageDefinition()`

### 路径 C：自己接前端渲染

适合你：

- 要用 React / Vue 自定义页面布局
- 不想用默认 renderer
- 想自己决定 block 怎么摆、怎么渲染、怎么套组件

优先看：

- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [使用 React 自定义渲染](/zh/docs/react-rendering)

主要入口：

- `@mdsnai/sdk/web`

最常用的 API：

- `parsePage()`
- `parseFragment()`
- `parseMarkdown()`

### 路径 D：只做协议解析

适合你：

- 只想解析页面协议
- 要做 lint、分析、校验、静态处理
- 不需要 server host，也不需要默认 renderer

主要入口：

- `@mdsnai/sdk/core`

最常用的 API：

- `parsePageDefinition()`

## 2. `@mdsnai/sdk`

这是聚合入口。

适合你：

- 还没确定最终边界
- 想快速试用 SDK 主能力
- 不介意从一个包里拿 framework / web / core 的公开 API

它暴露的主要能力有：

- 协议解析：`parsePageDefinition()`
- headless 解析：`parseMarkdown()`、`parsePage()`、`parseFragment()`
- 默认渲染：`createRenderModel()`、`renderPageHtml()`、`renderDefaultHtmlDocument()`
- framework：`createFrameworkApp()`、`defineConfig()`
- action：`defineAction()`

如果你的接入边界已经明确，优先直接用子入口：

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/framework`

## 3. `@mdsnai/sdk/framework`

这是“开箱即用”的站点开发入口。

什么时候用：

- 你要直接开发 MDSN 站点
- 你想用 `pages/` + `server/` 约定结构
- 你想直接跑 `dev / build / start`

最重要的 API：

- `createFrameworkApp()`
  - 创建 framework app
- `defineConfig()`
  - 定义站点配置

常见配套文档：

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)
- [配置参考](/zh/docs/config-reference)

## 4. `@mdsnai/sdk/server`

这是服务端承载和 fragment 序列化入口。

什么时候用：

- 你要自己接服务端框架
- 你要定义 `read` / `write` action
- 你要把数据序列化成 Markdown fragment

最常用的 API：

- `defineAction()`
  - 定义单个 action
- `defineActions()`
  - 定义多 action 文件
- `renderHostedPage()`
  - 按 `Accept` 渲染页面响应
- `renderMarkdownValue()`
  - 把数据值转成 Markdown 文本
- `serializeBlock()`
  - 把结构化 block 定义序列化成 `mdsn` 代码块
- `renderMarkdownFragment()`
  - 把正文 Markdown 和 block 拼成合法 fragment
- `executeActionHandler()`
  - 执行 action handler，并校验返回值是 Markdown 字符串
- `wantsHtml()`
  - 判断请求是否要 HTML

最重要的类型：

- `ActionContext`
- `ActionDefinition`
- `SerializableBlock`

## 5. `@mdsnai/sdk/web`

这是客户端和 headless 入口。

什么时候用：

- 你要自己渲染前端
- 你要在 React / Vue 里消费页面与 fragment
- 你要在默认 renderer 之外拿到结构化结果

先用这三个：

- `parseMarkdown()`
  - 解析纯 Markdown 结构
- `parsePage()`
  - 解析完整页面结构
- `parseFragment()`
  - 解析 action 返回的 fragment

默认渲染相关：

- `createRenderModel()`
- `renderPageHtml()`
- `renderDefaultHtmlDocument()`
- `getClientRuntimeScript()`

更底层的高级工具：

- `createPageBootstrap()`
- `parseBlockFragment()`
- `createPageRenderModel()`
- `createBlockRegionMarkup()`
- `replaceBlockRegionMarkup()`

如果你只是要做 headless 自定义渲染，优先记住：

- `parsePage()`
- `parseFragment()`
- `parseMarkdown()`

## 6. `@mdsnai/sdk/core`

这是最纯的协议解析入口。

什么时候用：

- 你只关心页面定义和协议结构
- 不想引入 server host 或 renderer

最重要的 API：

- `parsePageDefinition()`

最常用的类型：

- `DocumentDefinition`
- `BlockDefinition`
- `InputDefinition`
- `ReadDefinition`
- `WriteDefinition`

## 7. `@mdsnai/sdk/cli`

这是 CLI 入口。

主要用于：

- `mdsn create`
- `mdsn dev`
- `mdsn build`
- `mdsn start`

如果你是正常使用者，通常不需要在代码里直接调用它。

## 8. 稳定公开入口

稳定包入口：

- `@mdsnai/sdk`
- `@mdsnai/sdk/core`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/framework`
- `@mdsnai/sdk/cli`

非稳定边界：

- `sdk/src/*`
- 未通过 `exports` 暴露的内部文件

## 相关页面

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)
- [服务端开发](/zh/docs/server-development)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [使用 React 自定义渲染](/zh/docs/react-rendering)
