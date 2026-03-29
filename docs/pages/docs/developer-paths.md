---
title: Developer Paths
description: How to choose the right MDSN path when you are getting started
layout: docs
---

# Developer Paths

If you are new to MDSN, do not start by reading every reference page.

Start by answering one question:

**How do you want to integrate MDSN?**

## Path A: get something running fast

Use this when you:

- want to see a working page first
- do not want to wire your own server yet
- want the starter and built-in framework conventions

Read first:

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)

First import:

```ts
import { createFrameworkApp, defineConfig } from "@mdsnai/sdk";
```

First success check:

- `npm run dev` opens the homepage at `http://localhost:3000/`

## Path B: plug into your existing server

Use this when you:

- already have Express, Hono, Fastify, or Koa
- want to control routing, cookies, sessions, and auth
- only want to plug the page and action protocol into an existing system

Read first:

- [Server Development](/docs/server-development)
- [Action Reference](/docs/action-reference)

First import:

```ts
import { createHostedApp, defineActions, renderMarkdownFragment } from "@mdsnai/sdk";
```

First success check:

- your server can return both hosted page HTML and action Markdown fragments

## Path C: render the frontend yourself

Use this when you:

- want to keep MDSN as the page and action protocol
- want React or Vue to render the UI
- want to control the UI for blocks, inputs, and actions

Read first:

- [React Rendering](/docs/react-rendering)
- [Vue Rendering](/docs/vue-rendering)
- [SDK Reference](/docs/sdk-reference)

First import:

```ts
import { parsePage, parseFragment, parseMarkdown } from "@mdsnai/sdk";
```

First success check:

- you can parse a page or fragment and render the structured result inside your own components

## Path D: parse protocol structure only

Use this when you:

- only want to parse page structure
- are building lint, analysis, validation, or export tooling
- do not need a host or the default renderer

Read first:

- [SDK Reference](/docs/sdk-reference)

First import:

```ts
import { parsePageDefinition } from "@mdsnai/sdk/core";
```

First success check:

- you can extract frontmatter, body Markdown, and `BLOCK` definitions from a `.md` page

## Not sure yet?

If you are still unsure, start with:

- [Getting Started](/docs/getting-started)

That is the shortest and safest first path.
