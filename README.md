# MDSN

MDSN is a protocol and SDK for Markdown-native interactive pages, skills apps, and agent apps.

It keeps page content and page interaction in the same source by combining a Markdown body with an executable `mdsn` block.

## Why MDSN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDSN makes that interaction layer explicit while keeping the page source readable for humans, AI agents, and agentic AI systems.

In MDSN, page content is not just presentation. It is also shared prompt context for AI agents.

That means the same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

## Syntax

````md
# Guestbook

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  input nickname: text
  input message!: text
  read refresh: "/list"
  write submit: "/post" (nickname, message)
}
```
````

## Use Cases

- skills apps for non-technical users
- agent apps that agents can enter and operate directly without extra glue
- interactive documents with embedded actions
- AI agents and humans sharing the same page model
- shared human-agent workflows and human-agent collaboration on the same page model
- agentic workflows and AI workflow automation driven by page-native actions
- custom hosted interfaces with React, Vue, or your own server stack

## Quick Start

```bash
npm create mdsn@latest skills-app
cd skills-app
npm install
npm run dev
```

Open:

```text
http://localhost:3000/
```

The starter generates a minimal runnable site with:

- `pages/index.md`
- `server/actions.cjs`
