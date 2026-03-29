---
title: Framework Development
description: The main path for building MDSN sites with the built-in framework
layout: docs
---

# Framework Development

This path is about:

- using `@mdsnai/sdk/framework` directly
- starting from `@mdsnai/sdk` by default
- starting from the built-in starter
- knowing when to add `layout`, `config`, and `public`
- knowing when to move to [Server Development](/docs/server-development) or headless custom rendering

If you want to:

- get a site running quickly
- organize pages and actions by convention
- avoid building your own server first

this is the default path.

## 1. What the starter gives you

The current starter generates:

- `pages/index.md`
- `server/actions.cjs`
- `package.json`
- `README.md`

That means the minimum site only needs two working areas:

- `pages/`: page Markdown
- `server/`: `read` / `write` actions

This is the minimum development surface, not a full directory checklist.

## 2. What the framework handles for you

The built-in framework automatically handles:

- scanning `.md` pages under `pages/`
- mapping page files to routes
- scanning action files under `server/`
- resolving declared targets to action handlers
- serving page responses as `text/markdown` or `text/html`
- running `dev / build / start`

So by default, you do not need to worry about:

- building your own HTTP server
- implementing page content negotiation
- generating action manifests
- managing production output layout

## 3. Directory responsibilities

- `pages/`: page Markdown source files
- `server/`: action files
- `public/`: static assets, only when needed
- `layouts/`: layout templates, only when needed
- `mdsn.config.cjs`: site configuration, only when needed
- `dist/`: build output

## 4. How pages and actions are organized

Recommended shape:

- one page for one clear task
- one `BLOCK` for one clear interactive region
- one action file for one clear set of targets

The starter follows exactly this pattern:

- `pages/index.md`
- `server/actions.cjs`

## 5. What happens during a request

For a page request:

1. the framework finds the page source in `pages/`
2. it returns `text/markdown` or `text/html` based on `Accept`

For an action request:

1. the page declares a `read` or `write` target
2. the framework resolves the corresponding handler in `server/`
3. the handler returns a new Markdown fragment on success
4. the Host replaces the current `mdsn:block` region

Once this works, you already have a complete site.

## 6. When to add more directories

Only add these when you actually need them:

- `layouts/default.html`
  - when you want a custom page shell
- `public/`
  - when you need images, icons, scripts, styles, or other static assets
- `mdsn.config.cjs`
  - when you want custom directories, site metadata, i18n, or markdown settings

None of these are required by the starter.

## 7. When not to stay on this path

If you need to control:

- a custom server framework
- sessions, cookies, or auth middleware
- custom frontend rendering
- React or Vue headless integration

then continue with:

- [Server Development](/docs/server-development)
- [Custom Rendering with Vue](/docs/vue-rendering)
- [Custom Rendering with React](/docs/react-rendering)

## 8. Common commands

- development: `npm run dev`
- build: `npm run build`
- preview: `npm run start`

Recommended preflight:

```bash
npm install
npm run typecheck
npm test
npm run build
```

## 9. Build output

After build, `dist/` contains these stable files:

- `manifest/pages.json`
- `manifest/actions.json`
- `mdsn.config.json`

The page, server, asset, and layout directories follow `dirs.*` configuration:

- by default you will usually see `pages/`, `server/`, and optional `public/` and `layouts/`
- if you rename them to `content/`, `actions/`, `assets/`, or `templates/`, the build output keeps those names too
- only directories that exist and are enabled are written into `dist/`

## Related pages

- [Getting Started](/docs/getting-started)
- [Server Development](/docs/server-development)
- [Routing and Layouts](/docs/routing-layouts)
- [Config Reference](/docs/config-reference)
- [Action Reference](/docs/action-reference)
