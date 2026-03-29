# MDSN Agent Notes

## What MDSN Is

MDSN is a Markdown-native page and interaction model.

- Markdown carries the page body
- MDSN carries the interaction structure
- humans and agents consume the same page source through different hosts

The core runtime idea is simple:

- a page stays readable as Markdown
- an active region is anchored back into the page through `mdsn:block`
- `GET` and `POST` operations return Markdown fragments
- the host replaces only the current block region

## Current Canonical Model

Current primary keywords:

- `BLOCK`
- `INPUT`
- `GET`
- `POST`

Current canonical rules:

- `BLOCK` is the primary interaction scope
- interaction declarations stay inside a single executable `mdsn` code block
- page updates are driven by Markdown fragments returned from `GET` and `POST`
- recoverable failures should also return Markdown fragments with the next step spelled out
- the HTML anchor remains `<!-- mdsn:block name -->`

Minimal execution loop:

`INPUT -> GET|POST -> next Markdown fragment`

## Main Integration Paths

For most new work, start from the root package:

- `@mdsnai/sdk`

Current main paths are:

1. Built-in framework
   - fastest path
   - starter + `pages/` + `server/`
   - see `docs/pages/zh/docs/getting-started.md`
   - see `docs/pages/zh/docs/site-development.md`

2. Custom server hosting
   - Express / Hono / Fastify / Koa style integration
   - use `createHostedApp()` or `renderHostedPage()` plus manual routes
   - see `docs/pages/zh/docs/server-development.md`

3. Headless custom rendering
   - React / Vue or custom frontend rendering
   - use `parsePage()`, `parseFragment()`, `parseMarkdown()`
   - see `docs/pages/zh/docs/react-rendering.md`
   - see `docs/pages/zh/docs/vue-rendering.md`

4. Protocol-only tooling
   - use `@mdsnai/sdk/core`
   - start with `parsePageDefinition()`

Use child entrypoints only when stricter boundaries or narrower imports are the goal:

- `@mdsnai/sdk/framework`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/core`

## Repository Map

Primary areas:

- `sdk/`
  - reference SDK and runtime
- `docs/`
  - public documentation site
- `create-mdsn/`
  - starter scaffolding package
- `examples/`
  - focused examples, not the source of truth for protocol rules
- `tests/`
  - protocol, runtime, docs, and package validation

High-signal docs for collaboration:

- `README.md`
  - public top-level product entry
- `docs/pages/zh/docs.md`
  - Chinese docs entry
- `docs/pages/zh/docs/getting-started.md`
  - first-run onboarding
- `docs/pages/zh/docs/developer-paths.md`
  - route-selection page
- `docs/pages/zh/docs/sdk-reference.md`
  - public package entrypoint map

High-signal implementation areas:

- `sdk/src/core/`
  - protocol parsing and document model
- `sdk/src/server/`
  - hosted page rendering, actions, fragments, sessions
- `sdk/src/framework/`
  - built-in framework host path
- `sdk/src/web/`
  - headless/client rendering helpers

## Collaboration Notes

When changing the protocol or developer-facing behavior:

- update docs and examples in the same pass
- prefer the current canonical keyword and API story over legacy wording
- keep Chinese and English docs in sync when the page is user-facing
- validate with:
  - `npm test`
  - `npm run docs:check`
  - `npm run docs:build`

Current collaboration defaults:

- treat `BLOCK` as canonical syntax
- treat Markdown fragments as the normal success and recoverable-failure response model
- treat `@mdsnai/sdk` as the default public entrypoint
- treat docs onboarding pages as part of the product surface, not just reference material
