# @mdsnai/sdk

`@mdsnai/sdk` is the reference SDK and runtime for MDSN.

MDSN keeps page content and page interaction in the same source by combining a Markdown body with an executable `mdsn` block.

## Start With One Package

For most projects, start with subpath imports from one package:

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";
import { createHeadlessHost } from "@mdsnai/sdk/web";
import { mountMdsnElements } from "@mdsnai/sdk/elements";
```

Use the root entry (`@mdsnai/sdk`) when you want the combined API surface.

## Why MDSN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDSN makes that interaction layer explicit while keeping the page source readable for humans and AI agents.

## What This Package Includes

- the MDSN parser and core model
- server helpers for actions and Markdown fragments
- headless web APIs for custom rendering
- default Web Components UI

## Package Entry Points

- `@mdsnai/sdk`
- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

## Use Cases

- interactive docs with embedded actions
- skills/agent apps with Markdown as the protocol source
- hosted interfaces with your own server stack
- custom browser UIs built on the same headless runtime

## Quick Start

```bash
npm create mdsn@latest my-app
cd my-app
npm install
npm run start
```

## Docs

- [SDK Overview](https://docs.mdsn.ai/docs/sdk)
- [API Reference](https://docs.mdsn.ai/docs/api-reference)
- [Server Runtime](https://docs.mdsn.ai/docs/server-runtime)
- [Web Runtime](https://docs.mdsn.ai/docs/web-runtime)
- [Elements](https://docs.mdsn.ai/docs/elements)

For local source docs in this repo:

- `docs/sdk.md`
- `docs/api-reference.md`
- `docs/server-runtime.md`
- `docs/web-runtime.md`
- `docs/elements.md`
