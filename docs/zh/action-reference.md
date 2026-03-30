---
title: Action 参考
description: createHostedApp 中 action 的声明方式与处理约定。
---

# Action 参考

每个 action 都是显式、target-first：

```ts
{
  target: "/post",
  methods: ["POST"],
  routePath: "/guestbook",
  blockName: "guestbook",
  handler: ({ inputs, block }) => block()
}
```

## 必填字段

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

## 常见返回助手

- `block(...)`
- `ok(...)`
- `fail(...)`
- `stream(...)`
