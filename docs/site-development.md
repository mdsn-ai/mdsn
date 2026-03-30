---
title: Framework Development
description: Build an MDSN site with a hosted-app style architecture.
---

# Framework Development

This page documents the recommended site-development baseline in the current SDK.

## Recommended Composition

- Canonical page sources in Markdown files
- Page composition in server module (`composePage`)
- Explicit action registration (`createHostedApp`)
- Node hosting via `createNodeHost`
- Browser runtime via `createHeadlessHost`

## Why This Shape

- Keeps protocol logic in one place
- Avoids coupling app state to UI framework internals
- Supports both default UI and custom UI with the same server contract

## Minimal Structure

- `app/*.md` (canonical sources)
- `app/server.ts` (page/action composition)
- `app/client.ts` (headless/UI mount)
- `index.mjs` (runtime shell)

## Related Docs

- [Routing and Layouts](/docs/routing-layouts)
- [Config Reference](/docs/config-reference)
- [Action Reference](/docs/action-reference)
