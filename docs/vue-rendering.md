---
title: Custom Rendering with Vue
description: Use Vue as the UI layer on top of MDSN headless runtime.
---

# Custom Rendering with Vue

Use `@mdsnai/sdk/web` as the runtime source of truth, and let Vue own rendering.

## Pattern

1. `createHeadlessHost({ root, fetchImpl })`
2. `host.mount()`
3. Subscribe to snapshots
4. Render `snapshot.markdown` and `snapshot.blocks` in Vue

## Reference Example

- [examples/vue-starter/src/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/src/client.ts)
- [examples/vue-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/src/index.ts)

## When To Use

- You already have a Vue design system
- You want custom UI without reimplementing protocol runtime
