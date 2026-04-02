---
title: Agent App Demo
description: Walk through agent-driven flows using the current guestbook and auth-session examples.
---

# Agent App Demo

This page shows how an agent actually moves through an MDSN app using the current repository examples.

## Basic Flow

In MDSN, an agent loop is not “call a JSON API, then rebuild the next step yourself”.

It looks like this:

1. Read the full page Markdown.
2. Discover the operations available from the current content.
3. Execute one of those operations.
4. Read the returned Markdown fragment.
5. Continue from the updated context.

That loop works both for simple state updates like `guestbook` and for auth flows like `login`, `register`, and `vault`.

## Example A: Guestbook

Reference: [examples/guestbook/app/server.ts](/Users/hencoo/projects/mdsn/examples/guestbook/app/server.ts)

Server behavior:

- `GET /` returns the full page Markdown
- `GET /list` returns the guestbook block fragment
- `POST /post` appends a message and returns the updated guestbook block fragment

The key point is that both reads and writes stay inside the block, so the agent works with a smaller and more stable context.

## Example B: Auth Session

Reference: [examples/auth-session/app/server.ts](/Users/hencoo/projects/mdsn/examples/auth-session/app/server.ts)

This example adds two important patterns:

- session mutation during action handling with `signIn` and `signOut`
- explicit page transitions through `auto` follow-up reads resolved by the server host

Typical transitions:

- register success -> sign-in mutation plus `auto GET` follow-up to `/vault`
- login success -> `auto GET` follow-up to `/vault`
- logout -> sign-out mutation plus `auto GET` follow-up to `/login`

That means the agent does not have to guess where to go next. The returned content already carries the next path.

## Agent-Facing Error Strategy

Avoid opaque errors. Return actionable Markdown fragments that include the next legal operation.

In `auth-session`, unauthenticated writes to `vault` return a recoverable fragment that includes a `GET "/login"` operation.

## Verification Checklist

- the agent can identify executable operations, request methods, and input shape from the current page or fragment
- failure states still return Markdown that allows recovery
- session-changing operations also return clear follow-up actions
- write operations return updated block Markdown rather than stale content

## Related Docs

- [HTTP Content Negotiation](/docs/shared-interaction)
- [Application Structure](/docs/application-structure)
- [Server Integration](/docs/server-integration)
