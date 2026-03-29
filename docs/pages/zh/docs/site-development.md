---
title: 基础开发框架
description: 使用内建 framework 开发 MDSN 站点的主路径
layout: docs
---

# 基础开发框架

这条路径讲的是：

- 直接使用 `@mdsnai/sdk/framework`
- 默认从 `@mdsnai/sdk` 开始
- 从 starter 开始开发一个完整站点
- 什么时候再添加 `layout`、`config`、`public`
- 什么时候切到 [服务端开发](/zh/docs/server-development) 或 headless 自定义渲染

如果你要的是：

- 先快速做出一个站点
- 页面和 action 都按约定组织
- 不想先自己搭 server

这就是默认主路径。

## 1. starter 到底给了什么

当前 starter 默认只生成：

- `pages/index.md`
- `server/actions.cjs`
- `package.json`
- `README.md`

也就是说，最小站点只需要两件事：

- `pages/`：放页面 Markdown
- `server/`：放 `read` / `write` action

这是最小开发面，不是完整目录清单。

## 2. framework 默认帮你做了什么

内建 framework 会自动处理这些事情：

- 扫描 `pages/` 下的 `.md` 页面
- 把页面文件映射成路由
- 扫描 `server/` 下的 action 文件
- 把页面里声明的 target 映射到 action handler
- 处理页面的 `text/markdown` / `text/html` 响应
- 处理 `dev / build / start`

所以默认情况下，你不需要先关心：

- 自己搭 HTTP server
- 自己做页面协商
- 自己做 action manifest
- 自己做构建输出

## 3. 目录职责

- `pages/`：页面 Markdown 源文件
- `server/`：action 文件
- `public/`：静态资源，按需添加
- `layouts/`：布局模板，按需添加
- `mdsn.config.cjs`：站点配置，按需添加
- `dist/`：构建产物

## 4. 页面和 action 怎么组织

推荐方式：

- 一个页面负责一个明确任务
- 一个 `BLOCK` 负责一个明确交互片段
- 一个 action 文件负责一组明确 target

starter 默认就是这套结构：

- `pages/index.md`
- `server/actions.cjs`

## 5. 一次请求会经过什么链路

页面请求：

1. framework 找到 `pages/` 里的页面源
2. 按 `Accept` 返回 `text/markdown` 或 `text/html`

action 请求：

1. 页面里声明 `read` / `write` target
2. framework 在 `server/` 里找到对应 handler
3. handler 成功返回新的 Markdown fragment
4. Host 只替换当前 `mdsn:block` 区域

这条链路跑通后，你已经有一个完整站点了。

## 6. 什么时候再加别的目录

只有在需要时，再添加这些内容：

- `layouts/default.html`
  - 当你要自定义页面壳
- `public/`
  - 当你要放图片、图标、脚本、样式等静态资源
- `mdsn.config.cjs`
  - 当你要改目录、站点信息、i18n、markdown 配置

这三样都不是 starter 必需品。

## 7. 什么时候不该继续走这条路

如果你需要自己控制：

- 自定义服务端框架
- session / cookie / 鉴权中间件
- 前端自定义渲染
- React / Vue headless 接入

那就继续读：

- [服务端开发](/zh/docs/server-development)
- [使用 Vue 自定义渲染](/zh/docs/vue-rendering)
- [使用 React 自定义渲染](/zh/docs/react-rendering)

## 8. 常用命令

- 开发：`npm run dev`
- 构建：`npm run build`
- 预览：`npm run start`

预检命令：

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 9. 构建输出

构建后 `dist/` 中会包含这些稳定文件：

- `manifest/pages.json`
- `manifest/actions.json`
- `mdsn.config.json`

页面、服务端、静态资源和布局目录则遵循 `dirs.*` 配置：

- 默认情况下通常会看到 `pages/`、`server/`，以及按需启用的 `public/`、`layouts/`
- 如果你把目录改成 `content/`、`actions/`、`assets/`、`templates/`，构建输出也会保持同样名字
- 只有存在且启用的目录才会被写入 `dist/`

## 相关页面

- [快速开始](/zh/docs/getting-started)
- [服务端开发](/zh/docs/server-development)
- [路由与布局](/zh/docs/routing-layouts)
- [配置参考](/zh/docs/config-reference)
- [Action 参考](/zh/docs/action-reference)
