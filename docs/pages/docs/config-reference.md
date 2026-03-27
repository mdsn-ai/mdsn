---
title: Config Reference
description: When you need config, and which fields matter first
layout: docs
---

# Config Reference

Most starter projects do not need a config file at first.

By default:

- the page directory is `pages/`
- the action directory is `server/`
- the default port is `3000`
- the framework runs with built-in defaults

So this page is really about:

- when you actually need `mdsn.config.*`
- which config groups you will touch first

## 1. Supported config filenames

Supported config filenames:

- `mdsn.config.cjs`
- `mdsn.config.js`
- `mdsn.config.json`
- `mdsn.config.ts`
- `mdsn.config.mts`
- `mdsn.config.cts`

If you are publishing or running through the built CLI, prefer:

- `mdsn.config.cjs`

## 2. Smallest useful config

```ts
import { defineConfig } from "@mdsnai/sdk/framework";

export default defineConfig({
  site: { title: "My Site" },
});
```

In practice, a lot of projects start by changing only:

- `site.title`

## 3. The three groups you will change most often

Most projects touch these first:

- `site`
- `dirs`
- `i18n`

### `site`

Site metadata:

- `title`
- `description`
- `baseUrl`

Use this when you want to change:

- the site title
- SEO metadata
- the production base URL

### `dirs`

Directory conventions:

- `pages`
- `server`
- `public`
- `layouts`

Use this when:

- you do not want the default directory names
- you need to fit an existing project structure

Example:

```ts
export default defineConfig({
  dirs: {
    pages: "content",
    server: "actions",
    public: "public",
    layouts: "layouts",
  },
});
```

### `i18n`

Locale configuration:

- `defaultLocale`
- `locales`

Example:

```ts
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
  },
});
```

Rules:

- `defaultLocale` falls back to `locales[0]`
- `defaultLocale` is auto-added to `locales` when missing
- the default locale also gets unprefixed fallback routes when possible

## 4. Other common config groups

### `server`

The most common field here is the port:

```ts
export default defineConfig({
  server: {
    port: 4010,
  },
});
```

### `markdown`

Markdown rendering behavior:

- `linkify`
- `typographer`

### `dev`

Development-time behavior:

- `openBrowser`

## 5. Defaults

- `server.port`: `3000`
- `dirs.pages`: `pages`
- `dirs.server`: `server`
- `dirs.public`: `public`
- `dirs.layouts`: `layouts`
- `markdown.linkify`: `true`
- `markdown.typographer`: `false`
- `dev.openBrowser`: `true`
- `i18n.defaultLocale`: `locales[0] ?? "en"`
- `i18n.locales`: `["en"]`

## 6. Full config shape

```ts
type MdsnConfig = {
  site?: {
    title?: string;
    description?: string;
    baseUrl?: string;
  };
  server?: {
    port?: number;
  };
  dirs?: {
    pages?: string;
    server?: string;
    public?: string;
    layouts?: string;
  };
  markdown?: {
    linkify?: boolean;
    typographer?: boolean;
  };
  dev?: {
    openBrowser?: boolean;
  };
  i18n?: {
    defaultLocale?: string;
    locales?: string[];
  };
};
```

## Related pages

- [Framework Development](/docs/site-development)
- [Routing and Layouts](/docs/routing-layouts)
- [SDK Reference](/docs/sdk-reference)
