---
title: Web 运行时
description: @mdsnai/sdk/web 在浏览器侧的 headless 运行时模型。
---

# Web 运行时

`@mdsnai/sdk/web` 负责浏览器侧运行时：

- 读取 HTML bootstrap
- 管理 submit/visit 请求
- 维护 snapshot 状态
- 通知 UI 层订阅更新

基础模式：

```ts
import { createHeadlessHost } from "@mdsnai/sdk/web";
```

可与默认 UI (`@mdsnai/sdk/elements`) 或自定义框架 UI 结合使用。
