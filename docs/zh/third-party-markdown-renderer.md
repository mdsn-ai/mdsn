---
title: 第三方渲染器
description: 使用统一 markdownRenderer 接口注入第三方 Markdown 渲染能力。
---

# 第三方渲染器

你可以通过 `markdownRenderer` 注入同一份渲染器到：

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/elements`

这样服务端 HTML 渲染与默认 UI 渲染规则保持一致。

典型场景是接入 `marked` 等成熟库。
