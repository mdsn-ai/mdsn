---
title: Routing and Layouts
description: How routes, page handlers, and HTML shells are organized in MDSN.
---

# Routing and Layouts

## Route Model

MDSN uses explicit page routes and action targets.

- Page routes: `pages["/docs"] = () => composedPage`
- Action targets: each action declares `target + methods + routePath + blockName`

## Layout Strategy

Use server-side HTML wrapping through `renderHtml` (or `transformHtml` in Node host options) for shared shells.

Typical split:

- Markdown: content and interaction source
- `renderHtml`: global shell (header/nav/theme)
- browser runtime: block/page updates

## Locale and Docs Layout

In `docs-site`, locale routing is `/docs/*` and `/zh/docs/*`, with fallback when locale page is missing.

## Related Docs

- [Server Runtime](/docs/server-runtime)
- [Shared Interaction](/docs/shared-interaction)
