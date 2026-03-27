---
title: MDSN
description: MDSN documentation entry
layout: docs
---

# MDSN

MDSN is a Markdown-native language and reference implementation for interactive pages, skills apps, and agent apps.

If you are new to MDSN, the shortest way to understand it is this:

**A single page source defines both page content and page interaction.**

In MDSN:

- page content stays in Markdown
- dynamic regions are mounted back into the page through `mdsn:block` anchors
- successful `read` and `write` operations return new Markdown fragments
- the host replaces only the active block region

In MDSN, page content is not just presentation. It is also shared prompt context for AI agents.

This model is especially useful for:

- skills apps that can be shared by people and AI agents
- agent apps that agents can enter and operate directly
- interactive documents with embedded actions
- human-agent collaboration, agentic workflows, and AI workflow automation

## Start Here

If you want to get something running quickly:

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)

If you want to understand the interaction model first:

- [HTTP Content Negotiation and Shared Interaction](/docs/shared-interaction)
- [Agent App Demo Walkthrough](/docs/agent-app-demo)
- [Action Reference](/docs/action-reference)

If you already have your own server or frontend:

- [Agent App Demo Walkthrough](/docs/agent-app-demo)
- [Server Development](/docs/server-development)
- [React Rendering](/docs/react-rendering)
- [Vue Rendering](/docs/vue-rendering)

## Three Core Ideas

### 1. Page Source

An MDSN page usually contains:

- frontmatter
- a Markdown body
- one executable `mdsn` code block

### 2. Block

A `block` is an interaction scope inside the page.

It is mounted back into the Markdown body through an anchor such as `<!-- mdsn:block guestbook -->`, and becomes the replaceable region at runtime.

### 3. Fragment Update

A successful `read` or `write` does not return a full page refresh or an arbitrary JSON view. It returns a new Markdown fragment, and the host replaces only the current block region.

## Choose a Development Path

### Path A: Build a Site with the Built-in Framework

Use this if you want to:

- get started quickly
- use the starter project
- avoid building your own server first

Read:

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)

### Path B: Host MDSN in Your Own Server

Use this if you already have Express, Hono, Fastify, Koa, or another HTTP stack and want to control routing, sessions, cookies, auth, and integration with existing systems.

Read:

- [Server Development](/docs/server-development)
- [Action Reference](/docs/action-reference)
- [SDK Reference](/docs/sdk-reference)

### Path C: Use Your Own Frontend Rendering

Use this if you want to keep MDSN as the page and action protocol layer, while rendering the UI yourself with React or Vue.

Read:

- [React Rendering](/docs/react-rendering)
- [Vue Rendering](/docs/vue-rendering)
- [SDK Reference](/docs/sdk-reference)

## Reference

- [Action Reference](/docs/action-reference)
- [Config Reference](/docs/config-reference)
- [CLI Reference](/docs/cli-reference)
- [SDK Reference](/docs/sdk-reference)
