---
title: 服务端开发
description: 在已有后端框架中集成 MDSN 服务端运行时。
---

# 服务端开发

## 集成模型

- 业务逻辑在你的服务层
- 协议运行时使用 `createHostedApp()` / `createMdsnServer()`
- 适配层只做 request/response 映射，核心走 `server.handle()`

## 关键行为

- 直写请求 `Content-Type` 必须是 `text/markdown`
- 非法 Markdown body -> `400`
- 错误写入媒体类型 -> `415`
- 不可接受表示 -> `406`
