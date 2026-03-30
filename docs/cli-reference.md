---
title: CLI Reference
description: Current CLI surface in the MDSN 0.3.x line.
---

# CLI Reference

Current published CLI entry is `create-mdsn`.

## Scaffold a New Project

```bash
npm create mdsn@latest my-app
```

Equivalent executable:

```bash
npx create-mdsn my-app
```

## Generated Files

- `app/guestbook.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## Notes

- `create-mdsn` tracks the published `@mdsnai/sdk` version.
- In the current package layout, there is no standalone `@mdsnai/sdk/cli` export.
