---
title: 服务端运行时
description: @mdsnai/sdk/server 的职责、入口与常见集成方式。
---

# 服务端运行时

`@mdsnai/sdk/server` 负责：

- page/action 路由执行
- markdown/html/event-stream 协商
- Markdown body 解析与写入校验
- Node `http` 托管桥接

常见组合：

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";
```

更完整的 API 请看 [API 参考](/zh/docs/api-reference)。
