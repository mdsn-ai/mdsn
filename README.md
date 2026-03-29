# MDSN

MDSN is a protocol and SDK for Markdown-native interactive pages, skills apps, and agent apps.

It keeps page content and page interaction in the same source by combining a Markdown body with an executable `mdsn` block.

## Start With One Package

For most projects, start with:

```ts
import { createFrameworkApp, defineConfig } from "@mdsnai/sdk";
```

```ts
import {
  createHostedApp,
  createActionContextFromRequest,
  defineActions,
  renderHostedPage,
  renderMarkdownFragment,
  renderMarkdownValue,
} from "@mdsnai/sdk";
```

```ts
import { parsePage, parseFragment } from "@mdsnai/sdk";
```

Use the root entry point for the common paths:

- build a site with the built-in framework
- host MDSN pages and actions inside your own server
- render the UI yourself with React or Vue

Move to `@mdsnai/sdk/framework`, `@mdsnai/sdk/server`, `@mdsnai/sdk/web`, or `@mdsnai/sdk/core` only when you want stricter boundaries or narrower imports.

## Quick Start

```bash
npm create mdsn@latest skills-app
cd skills-app
npm install
npm run dev
```

Open:

```text
http://localhost:3000/
```

The starter generates a minimal runnable site with:

- `pages/index.md`
- `server/actions.cjs`

Read next:

- framework path: [`docs/getting-started`](docs/pages/docs/getting-started.md)
- custom server path: [`docs/server-development`](docs/pages/docs/server-development.md)
- entry point guide: [`docs/sdk-reference`](docs/pages/docs/sdk-reference.md)

## Why MDSN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDSN makes that interaction layer explicit while keeping the page source readable for humans, AI agents, and agentic AI systems.

In MDSN, page content is not just presentation. It is also shared prompt context for AI agents.

That means the same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

## Syntax

````md
# Guestbook

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

## Use Cases

- skills apps for non-technical users
- agent apps that agents can enter and operate directly without extra glue
- interactive documents with embedded actions
- AI agents and humans sharing the same page model
- shared human-agent workflows and human-agent collaboration on the same page model
- agentic workflows and AI workflow automation driven by page-native actions
- custom hosted interfaces with React, Vue, or your own server stack
