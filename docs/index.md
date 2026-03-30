---
title: MDSN
description: MDSN documentation entry
---

# MDSN

MDSN is a Markdown-native SDK runtime for interactive pages, skills apps, and agent apps.

If you are new, the shortest mental model is:

**One page source defines both page content and page interaction.**

In MDSN:

- page content stays in Markdown
- dynamic regions are mounted back through `mdsn:block` anchors
- successful reads and writes return Markdown fragments
- the host replaces only the active block region

## Start Here

- [SDK Overview](/docs/sdk)
- [Server Runtime](/docs/server-runtime)
- [Web Runtime](/docs/web-runtime)

## Three Core Ideas

### 1. Page Source

An MDSN page usually contains:

- frontmatter
- a Markdown body
- one executable `mdsn` code block

### 2. Block

A `BLOCK` is an interaction scope inside the page.

It is mounted into Markdown body by anchors like `<!-- mdsn:block guestbook -->`, and becomes the replaceable region at runtime.

### 3. Fragment Update

A successful `read` or `write` returns a Markdown fragment, and the host replaces only the current block region.

## Recommended Reading Order

- [SDK Overview](/docs/sdk)
- [API Reference](/docs/api-reference)
- [Elements](/docs/elements)
- [Session Provider](/docs/session-provider)
- [Third-Party Markdown Renderer](/docs/third-party-markdown-renderer)
- [Examples](/docs/examples)
