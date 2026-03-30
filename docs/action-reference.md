---
title: Action Reference
description: Action declaration and handler behavior in createHostedApp.
---

# Action Reference

Each hosted action is explicit and target-first.

## Action Shape

```ts
{
  target: "/post",
  methods: ["POST"],
  routePath: "/guestbook",
  blockName: "guestbook",
  handler: ({ inputs, block, page, request, session }) => block()
}
```

## Required Fields

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

## Handler Helpers

Common helpers in action context:

- `block()`
- `page()`

## Result Helpers

Use server helpers when needed:

- `ok(...)`
- `fail(...)`
- `block(...)`
- `stream(...)`
- `signIn(...)`
- `signOut()`
- `refreshSession(...)`

See [API Reference](/docs/api-reference) for details.
