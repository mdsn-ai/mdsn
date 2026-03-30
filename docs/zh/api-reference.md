---
title: API 参考
description: @mdsnai/sdk 各子路径公共 API 总览。
---

# API 参考

建议按子路径理解 API：

- `@mdsnai/sdk/core`
  - `parsePage`, `composePage`, `serializePage`, `serializeFragment`
  - `parseMarkdownBody`, `serializeMarkdownBody`
- `@mdsnai/sdk/server`
  - `createHostedApp`, `createMdsnServer`, `createNodeHost`
  - `block`, `ok`, `fail`, `stream`
  - `signIn`, `signOut`, `refreshSession`
- `@mdsnai/sdk/web`
  - `createHeadlessHost`
- `@mdsnai/sdk/elements`
  - `mountMdsnElements`, `registerMdsnElements`

详细签名以英文版 [API Reference](/docs/api-reference) 为准，中文页持续补充中。
