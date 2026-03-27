---
title: HTTP Content Negotiation and Shared Interaction
description: Why the same MDSN page can be shared by humans and agents
layout: docs
---

# HTTP Content Negotiation and Shared Interaction

This page covers one of the most important parts of MDSN:

- why the same page can be shown to humans and read by AI agents
- why the same action can be called by the browser and by an agent
- why this is the foundation of a shared page model

This is also the foundation for skills apps, agent apps, human-agent collaboration, and agentic workflows that do not need a separate agent-only integration layer.

## 1. The problem

In a typical web app:

- HTML is for human rendering
- APIs are for machine calls

But AI agents and agentic workflows usually need to cross both layers:

- read page content
- discover available actions
- call APIs
- reinterpret API results as page state

That usually leads to a lot of custom glue, especially in AI workflow automation systems.

MDSN makes that interaction layer explicit.

The deeper reason this works is that page content in MDSN is not only presentation. It is also shared prompt context for AI agents. The same Markdown source can describe the current task, the current state, and the next available actions without forcing agents to reconstruct meaning from HTML or hidden frontend state.

## 2. Why the same page works for humans and agents

The same page route supports two negotiated response forms:

- `Accept: text/markdown`
- `Accept: text/html`

Meaning:

- `text/markdown`
  - returns the original page Markdown
  - useful for AI agents, debugging, and inspection
- `text/html`
  - returns hosted HTML
  - useful for browsers

So:

- the agent reads the page source model
- the human sees the hosted HTML view
- both come from the same page definition

## 3. Why actions work for both too

`read` and `write` targets are directly callable HTTP addresses.

In HTTP Host:

- `read` uses `POST`
- `write` uses `POST`

Request payloads are Markdown-first:

```md
nickname: "Guest"
message: "Hello"
```

JSON is still supported for compatibility:

```json
{ "inputs": { ... } }
```

Successful responses also support negotiation:

- `Accept: text/markdown`
  - returns a new Markdown fragment
- `Accept: application/json`
  - returns the Host runtime JSON envelope

That means:

- an agent can keep consuming Markdown fragments
- a browser runtime can keep consuming JSON for block updates

That shared transport is what makes MDSN suitable for agent apps, skills apps, and other human-agent collaboration surfaces.

## 4. What a full interaction chain looks like

For a minimal guestbook page:

````mdsn-src
```mdsn
block guestbook {
  input nickname: text
  input message!: text
  read refresh: "/list"
  write submit: "/post" (nickname, message)
}
```
````

For an agent, the chain looks like this:

1. `GET /guestbook` with `Accept: text/markdown`
2. read the page body and `mdsn` declaration
3. discover `/list` and `/post`
4. `POST /post`
5. ask for `Accept: text/markdown`
6. receive a new fragment and continue

For a browser, the chain looks like this:

1. `GET /guestbook` with `Accept: text/html`
2. open the page
3. trigger `read` or `write`
4. call the action with `Accept: application/json`
5. let the Host runtime update the current block

The transport forms differ, but the page model does not.

## 5. Why this is “shared interaction”

Shared interaction is not just:

- humans and agents visiting the same URL

The real requirement is:

- both see the same page model
- both discover the same declared actions
- both call the same targets
- both continue from the same Markdown-native update model

So MDSN does not define:

- one page for humans
- one special protocol for agents

It defines:

- one page model
- two delivery forms
- one executable interaction structure

## 6. How this relates to the protocol

This is directly tied to the current MDSN model:

- page body is static Markdown
- `mdsn:block` marks the replaceable region
- `read` and `write` return new Markdown fragments on success
- `redirect` handles page-level navigation

Without HTTP negotiation:

- agents would have to infer meaning from HTML
- or bypass the page and call internal APIs directly

With it:

- agents can read page Markdown first
- then call the declared targets directly
- then continue from the returned Markdown fragment

That is the foundation for humans and agents sharing the same page interaction model.

## Related pages

- [Action Reference](/docs/action-reference)
- [Server Development](/docs/server-development)
