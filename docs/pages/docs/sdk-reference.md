---
title: SDK Reference
description: How to choose the right public entry point in @mdsnai/sdk
layout: docs
---

# SDK Reference

`@mdsnai/sdk` is not a single flat API surface.

It gives you a few different ways to work:

- build a site directly with the framework
- host pages and actions in your own server
- render pages yourself with headless client APIs
- parse protocol structure only

This page answers two questions first:

- which package entry point should you use
- which APIs matter most for that entry point

Only after that does it list the public exports.

## 1. Choose a path first

### Path A: build a site directly

Use this when:

- you want the fastest way to get started
- you do not want to wire your own server yet
- you want the starter and built-in framework conventions

Read first:

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)

Main package entry:

- `@mdsnai/sdk/framework`

Most important APIs:

- `createFrameworkApp()`
- `defineConfig()`

### Path B: host pages in your own server

Use this when:

- you already have Express, Hono, Fastify, or Koa
- you want to control routes, cookies, sessions, and auth
- you want to plug MDSN pages and actions into an existing server

Read first:

- [Server Development](/docs/server-development)

Main package entries:

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/core`

Most important APIs:

- `renderHostedPage()`
- `defineAction()`
- `defineActions()`
- `renderMarkdownValue()`
- `renderMarkdownFragment()`
- `parsePageDefinition()`

### Path C: render the client yourself

Use this when:

- you want React or Vue to decide the layout
- you do not want the default renderer
- you want to control how blocks, inputs, and controls look

Read first:

- [Custom Rendering with Vue](/docs/vue-rendering)
- [Custom Rendering with React](/docs/react-rendering)

Main package entry:

- `@mdsnai/sdk/web`

Most important APIs:

- `parsePage()`
- `parseFragment()`
- `parseMarkdown()`

### Path D: parse protocol structure only

Use this when:

- you only want to parse page structure
- you are building lint, analysis, validation, or static tooling
- you do not need a server host or renderer

Main package entry:

- `@mdsnai/sdk/core`

Most important API:

- `parsePageDefinition()`

## 2. `@mdsnai/sdk`

This is the aggregate entry point.

Use it when:

- you want to try the main capabilities quickly
- you are not sure yet which boundary you need
- you are okay importing framework, web, and core APIs from one package

Main capabilities exposed here:

- protocol parsing: `parsePageDefinition()`
- headless parsing: `parseMarkdown()`, `parsePage()`, `parseFragment()`
- default rendering: `createRenderModel()`, `renderPageHtml()`, `renderDefaultHtmlDocument()`
- framework: `createFrameworkApp()`, `defineConfig()`
- actions: `defineAction()`

If your integration boundary is already clear, prefer the focused entry points:

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/framework`

## 3. `@mdsnai/sdk/framework`

This is the built-in framework entry point.

Use it when:

- you want to build an MDSN site directly
- you want the `pages/` + `server/` convention
- you want `dev / build / start` to work out of the box

Most important APIs:

- `createFrameworkApp()`
- `defineConfig()`

## 4. `@mdsnai/sdk/server`

This is the server hosting and fragment serialization entry point.

Use it when:

- you are wiring your own server framework
- you are defining `read` / `write` handlers
- you want to serialize data into Markdown fragments

Most important APIs:

- `defineAction()`
- `defineActions()`
- `renderHostedPage()`
- `renderMarkdownValue()`
- `serializeBlock()`
- `renderMarkdownFragment()`
- `executeActionHandler()`
- `wantsHtml()`

## 5. `@mdsnai/sdk/web`

This is the client and headless entry point.

Use it when:

- you are rendering the UI yourself
- you want React or Vue to consume page and fragment structure
- you want structured results instead of fixed HTML

Start with these three:

- `parseMarkdown()`
- `parsePage()`
- `parseFragment()`

Default rendering APIs:

- `createRenderModel()`
- `renderPageHtml()`
- `renderDefaultHtmlDocument()`
- `getClientRuntimeScript()`

Lower-level helpers:

- `createPageBootstrap()`
- `parseBlockFragment()`
- `createPageRenderModel()`
- `createBlockRegionMarkup()`
- `replaceBlockRegionMarkup()`

If you are doing headless custom rendering, the first three are the ones to remember.

## 6. `@mdsnai/sdk/core`

This is the pure protocol parsing entry point.

Use it when:

- you only care about the page definition and protocol structure
- you do not want server hosting or rendering at all

Most important API:

- `parsePageDefinition()`

## 7. Stable public entry points

- `@mdsnai/sdk`
- `@mdsnai/sdk/core`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/framework`
- `@mdsnai/sdk/cli`

## 8. Non-stable boundary

- `sdk/src/*`
- any internal file not exposed through package `exports`
