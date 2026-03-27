# create-mdsn

`create-mdsn` scaffolds a new MDSN site project.

Use it when you want the shortest path to a runnable MDSN skills app or agent app.

## What It Creates

The starter generates a minimal runnable site with:

- `pages/index.md`
- `server/actions.cjs`

That gives you one Markdown page and one action module to start from.

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

## What MDSN Is For

MDSN is a Markdown-native interaction model for:

- skills apps
- agent apps
- interactive documents
- shared human-agent workflows

In MDSN, page content is not just presentation. It is also shared prompt context for AI agents.

That is what lets the same page source work as:

- content for humans
- interaction structure for hosts
- prompt context for agents

## Docs

- [Getting Started](https://docs.mdsn.ai/docs/getting-started)
- [Framework Development](https://docs.mdsn.ai/docs/site-development)
- [HTTP Content Negotiation and Shared Interaction](https://docs.mdsn.ai/docs/shared-interaction)
