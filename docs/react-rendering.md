---
title: Custom Rendering with React
description: Use React as the UI layer on top of MDSN headless runtime.
---

# Custom Rendering with React

Use `@mdsnai/sdk/web` for runtime and React for rendering.

## Pattern

1. `createHeadlessHost({ root, fetchImpl })`
2. `host.mount()`
3. Subscribe in React lifecycle/hooks
4. Render from `snapshot.markdown` and `snapshot.blocks`

## Reference Example

- [examples/react-starter/src/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/src/client.tsx)
- [examples/react-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/react-starter/src/index.ts)

## When To Use

- You want full React ownership of interaction UI
- You still want MDSN protocol/runtime guarantees
