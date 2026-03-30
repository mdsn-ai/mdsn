---
title: Agent App Demo Walkthrough
description: End-to-end walkthrough of an agent-facing MDSN app flow.
---

# Agent App Demo Walkthrough

This walkthrough explains the protocol flow used by the demo-style apps.

## Flow

1. Agent requests a page route.
2. Server returns full page Markdown.
3. Agent selects a block action target.
4. Server returns block Markdown fragment.
5. Agent iterates using updated fragment context.

## Why It Matters

MDSN keeps human-readable content and machine-operable interaction in one canonical source.

## Practical References

- [examples/guestbook/src/index.ts](/Users/hencoo/projects/mdsn/examples/guestbook/src/index.ts)
- [examples/auth-session/src/index.ts](/Users/hencoo/projects/mdsn/examples/auth-session/src/index.ts)
- [Shared Interaction](/docs/shared-interaction)
