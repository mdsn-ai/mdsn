---
title: 开发者路线图
description: 根据你的场景选择最合适的 MDSN 集成路径。
---

# 开发者路线图

## 路线 A：Hosted App + 默认 UI

适合追求上线速度，直接使用：

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

## 路线 B：Hosted App + 自定义 UI

适合已有设计系统，保留协议运行时，UI 自己渲染：

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- Vue / React 等框架层

## 路线 C：已有后端集成

适合已有 Express/Hono/Next 项目：

- 通过 `createMdsnServer()` 或 `createHostedApp()`
- 在适配层调用 `server.handle()`

## 路线 D：只用协议工具

只需要解析/校验/序列化时使用：

- `@mdsnai/sdk/core`
