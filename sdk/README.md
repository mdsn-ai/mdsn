# @mdsnai/sdk

`@mdsnai/sdk` is the reference SDK for building apps with MDSN.

It officially supports Node and Bun through a shared server runtime plus runtime-specific host adapters.

MDSN is a Markdown-first page and interaction format. `@mdsnai/sdk` gives you the parser, server runtime, browser runtime, and default UI for working with it.

## Why MDSN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDSN makes that interaction layer explicit while keeping the page source readable for humans, AI agents, and agentic systems.

In MDSN, page content is not only presentation. It is also shared prompt context for AI agents.

The same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

The default server runtime keeps Markdown canonical while also supporting explicit `auto` `GET` dependencies. Server hosts resolve `auto` before returning results, so agents and browsers observe the same final state. See the protocol/runtime docs for the full rules.

## Use Cases

- skills apps with guided inputs and step-by-step actions for non-technical users
- agent apps that agents can read, enter, and continue over HTTP
- interactive docs, runbooks, and internal tools with embedded actions
- shared pages where humans and agents work from the same content and next-step actions
- agentic workflows where the server returns both updated results and the next actions to take
- custom hosted interfaces built with React, Vue, or your own server stack

## Syntax

The starter page keeps Markdown content and the interaction block in the same file:

```text
---
title: "Agent App"
---

# Agent App

Use this starter as the smallest end-to-end MDSN app.

<!-- mdsn:block main -->

BLOCK main {
  INPUT text required -> message
  GET "/list" -> load_messages auto
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```

## Quick Start

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

You can also force either runtime with `--runtime node` or `--runtime bun`.

## Runtime Adapters

Shared server modeling stays on `@mdsnai/sdk/server`:

```ts
import { createHostedApp } from "@mdsnai/sdk/server";
```

Then choose the host adapter for your runtime:

```ts
import { createHost } from "@mdsnai/sdk/server/node";
```

```ts
import { createHost } from "@mdsnai/sdk/server/bun";
```

## Docs

- [Getting Started](https://docs.mdsn.ai/getting-started)
- [Understanding MDSN](https://docs.mdsn.ai/understanding-mdsn)
- [SDK Overview](https://docs.mdsn.ai/sdk)
- [Custom Rendering](https://docs.mdsn.ai/custom-rendering)
- [API Reference](https://docs.mdsn.ai/api-reference)
