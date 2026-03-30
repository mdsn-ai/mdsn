---
title: Getting Started
description: Build and run your first MDSN app with @mdsnai/sdk.
---

# Getting Started

This guide gets you from zero to a running MDSN app.

## Option A: Start from the published starter

```bash
npm create mdsn@latest my-app
cd my-app
npm install
npm run start
```

Open `http://127.0.0.1:3000/` (or the port printed by your app).

## Option B: Start from this repository

```bash
npm install
npm run build
npm test
```

Then run one of the example shells under `examples/*/dev.mjs`.

## Starter Shape

`create-mdsn` generates a minimal app:

- `app/guestbook.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## Core Loop

1. Define canonical page source in Markdown.
2. Use `composePage()` to attach runtime block content.
3. Register actions with `createHostedApp({ pages, actions })`.
4. Host with `createNodeHost()`.
5. In browser, mount `createHeadlessHost()` and optionally `mountMdsnElements()`.

## Next

- [Developer Paths](/docs/developer-paths)
- [SDK Overview](/docs/sdk)
- [Examples](/docs/examples)
