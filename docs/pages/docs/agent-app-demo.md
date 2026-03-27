---
title: Agent App Demo Walkthrough
description: A complete walkthrough of the MDSN chat demo as an agent app
layout: docs
---

# Agent App Demo Walkthrough

The chat demo is the clearest end-to-end showcase of what MDSN is trying to make possible:

- a human can open the page in a browser
- a fresh AI agent can read the same page as Markdown
- both sides can follow the same declared interaction structure
- both sides can continue from the same Markdown fragment updates

This is why we describe MDSN as a foundation for **agent apps** and **skills apps**.

The most important product idea in this demo is not just that the page is interactive. It is that the page reads like a shared prompt surface:

- each page tells the agent what stage it is in
- each page tells the agent what the goal is
- each page tells the agent which action to take next
- each failure returns a new Markdown fragment with the next step spelled out

## What this demo proves

The chat demo proves a full loop:

1. a new visitor starts on the login page
2. if no account exists yet, the page exposes an explicit redirect to the register page
3. registration succeeds and redirects to `/chat`
4. login succeeds and redirects to `/chat`
5. the chat page supports sending messages, refreshing, loading older history, and logging out
6. recoverable failures return new Markdown fragments instead of opaque frontend-only state

That means a fresh agent can complete the full flow without hidden glue.

## Pages in the demo

The demo uses three pages:

- `/`
  - login page
- `/register`
  - account creation page
- `/chat`
  - shared room page

Each page is still a Markdown page with executable `mdsn` blocks.

## 1. Login page

The login page asks for:

- `email`
- `password`

It also exposes a separate navigation block that redirects to `/register`.

For an agent, this matters because the page does not hide registration behind client-only UI state. The page declares the current stage, the goal, and the next possible action directly.

## 2. Register page

The register page asks for:

- `username`
- `email`
- `password`

It also exposes a separate navigation block that redirects back to `/`.

If registration succeeds, the action returns a redirect to `/chat`.

If registration fails, the action returns a new Markdown fragment that explains:

- what failed
- why it failed
- what to do next

## 3. Chat page

The chat page is a single-room agent app.

It exposes:

- `send`
  - submit a new message
- `refresh`
  - read the latest room state
- `load_more`
  - read older messages for more context through `/load-more`
- `logout`
  - end the current session and return to `/`

The default room view shows the most recent `50` messages. If a human or an agent needs deeper context, `load_more` expands the history window.

This is also where the demo starts to feel different from a normal HTML app. The page itself can tell the agent:

- you are already in the shared room
- the latest 50 messages are visible
- `refresh` rereads the current state
- `load_more` expands the context window
- `logout` ends the session

## Why this is agent-friendly

This demo is not just a browser demo. It is designed so a fresh agent can operate it directly.

The key reasons are:

- page content is available as Markdown
- the page body itself carries task and state instructions
- `read`, `write`, and `redirect` are explicitly declared
- action targets are directly callable HTTP addresses
- successful updates return Markdown fragments
- recoverable failures also return Markdown fragments

In other words, the page is not only presentation. It is also shared prompt context for the agent.

## Failure handling

The demo uses the same principle for both auth and chat:

- recoverable failures do not only become local browser errors
- they return a new Markdown fragment
- the fragment explains the current problem and the next step

Examples:

- login failure
  - the fragment explains that no account matches the provided credentials
- registration failure
  - the fragment explains that the identity is already registered
- send failure
  - the fragment explains that a message is required before the action can continue

This makes the flow easier for both humans and AI agents to recover from.

## Human and agent transport

The same demo works for both sides because of HTTP content negotiation:

- page requests
  - `Accept: text/html` for browsers
  - `Accept: text/markdown` for agents
- action requests
  - `Accept: text/markdown` for agent-readable fragment updates
  - `Accept: application/json` for host runtime envelopes where needed

That is the technical reason the same page model can support both human-agent collaboration and direct agent operation.

## Where to read next

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)
- [HTTP Content Negotiation and Shared Interaction](/docs/shared-interaction)
- [Server Development](/docs/server-development)
