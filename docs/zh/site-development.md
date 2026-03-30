---
title: 基础开发框架
description: 使用 Hosted App 架构构建 MDSN 站点。
---

# 基础开发框架

推荐的站点开发形态：

- Markdown 作为 canonical 页面源
- `composePage()` 负责页面组合
- `createHostedApp({ pages, actions })` 负责路由与动作
- `createNodeHost()` 负责 Node 托管
- `createHeadlessHost()` 负责浏览器运行时

## 最小目录建议

- `app/*.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`
