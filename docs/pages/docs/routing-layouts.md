---
title: Routing and Layouts
description: Page paths, dynamic segments, layouts, and locale fallback rules
layout: docs
---

# Routing and Layouts

This page explains two things:

- how a page file becomes a URL
- how a layout participates in page hosting

## 1. The core rule

Routes come directly from Markdown file paths under `pages/`.

That means:

- you change the page file path
- the final URL changes with it

Common examples:

- `pages/index.md` -> `/`
- `pages/docs/index.md` -> `/docs`
- `pages/blog/post.md` -> `/blog/post`

## 2. `index.md` means the directory root page

`index.md` means “this directory itself”.

Examples:

- `pages/index.md`
  - root page `/`
- `pages/docs/index.md`
  - `/docs`
- `pages/zh/docs/index.md`
  - `/zh/docs`

If you want the directory itself to have a page, use `index.md`.

## 3. Dynamic segments

Dynamic segments use square brackets:

- `pages/blog/[slug].md` -> `/blog/:slug`
- `pages/users/[id].md` -> `/users/:id`

Matching rules:

- static routes win over dynamic routes
- dynamic routes only match when a static page does not exist

So if both exist:

- `pages/blog/about.md`
- `pages/blog/[slug].md`

then `/blog/about` resolves to the static page first.

## 4. When layouts participate

Layouts are shared page shells, not page meaning.

Set a layout in frontmatter:

```yaml
layout: docs
```

The framework then resolves:

- `layouts/*.html`

If no `layout` is set, the page uses the default hosted shell.

So layouts should be used for:

- shared site chrome
- shared header, footer, navigation
- docs shells

They should not be used to hold the meaning of the page itself.

## 5. Layout variables

Layout templates can use:

- `{{content}}`
- `{{title}}`
- `{{description}}`
- `{{lang}}`
- `{{locale}}`
- `{{defaultLocale}}`
- `{{pathname}}`
- `{{canonical_url}}`
- `{{markdown_alternate_url}}`
- `{{hreflang_links}}`

The most commonly used are:

- `{{content}}`
- `{{title}}`
- `{{description}}`

## 6. Locale-aware paths

Locale pages live under:

- `pages/en/...`
- `pages/zh/...`

Examples:

- `pages/en/docs.md` -> `/en/docs`
- `pages/zh/docs/getting-started.md` -> `/zh/docs/getting-started`

## 7. Default locale fallback

If a route belongs to the `defaultLocale`, the framework tries to provide an unprefixed fallback route too.

For example:

- `defaultLocale = "en"`
- `pages/en/docs.md`

then the framework can serve both:

- `/en/docs`
- `/docs`

But if you explicitly add:

- `pages/docs.md`

then `/docs` resolves to that explicit page first.

## 8. Recommended pattern

- keep page meaning in Markdown pages
- use `mdsn:block` only for dynamic regions
- use layouts only for shared shell

## Related pages

- [Framework Development](/docs/site-development)
- [Config Reference](/docs/config-reference)
