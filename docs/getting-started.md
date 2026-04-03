---
title: Getting Started
description: Get your first MDSN app running with @mdsnai/sdk.
---

# Getting Started

This page does one thing: get your first MDSN app running in a few minutes.

MDSN officially supports Node and Bun.

- choose Node if you want the most established host baseline
- choose Bun if you want a Bun-native starter and toolchain entry
- the app model stays the same across both runtimes

Current npm releases:

- `create-mdsn@0.4.5`
- `@mdsnai/sdk@0.4.3`

## 1. Create and Start a Project

Node starter:

```bash
npm create mdsn@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdsn agent-app
cd agent-app
bun install
bun start
```

You can force either runtime with:

```bash
npm create mdsn@latest agent-app -- --runtime bun
bunx create-mdsn agent-app --runtime node
```

Open `http://127.0.0.1:3000/` by default.

If you set the `PORT` environment variable yourself, use that port instead.

If you prefer, you can also use:

```bash
npx create-mdsn agent-app
```

## 2. Key Files

- `app/index.md`
  Page content and interaction definitions live here
- `app/server.ts`
  Page composition, state, and action handlers live here
- `app/client.ts`
  Browser runtime and default UI mounting live here
- `index.mjs`
  Local runtime host entry lives here

## 3. Common Places To Start Editing

In most cases, these two files are enough to get started:

- `app/index.md`
- `app/server.ts`

You can usually leave `app/client.ts` alone until you want to bring your own UI.

## 4. See More Examples

If you are browsing the [MDSN repository](https://github.com/mdsn-ai/mdsn), you can also run the starter example in `examples/starter/`.

That in-repo example keeps its current Node host shell, even though the published starter can now target Node or Bun.

First run this once from the repository root:

```bash
npm install
```

Or:

```bash
bun install
```

Then start the example from its directory:

```bash
cd examples/starter
npm start
```

You can still use Bun for the install/build side:

```bash
bun install
bun run build
```

## 5. Next

- Want a clearer definition before going deeper: [What is MDSN?](/docs/what-is-mdsn)
- Want to understand how it works: [Understanding MDSN](/docs/understanding-mdsn)
- Want to start building a real app: [Application Structure](/docs/application-structure)
- Want to browse more examples: [Examples](/docs/examples)
