# Examples

The repository includes eight examples:

- `examples/starter`: minimal runnable scaffold
- `examples/docs-site`: docs website starter built with MDSN runtime
- `examples/express-starter`: starter with an Express adapter
- `examples/marked-starter`: starter with a third-party Markdown renderer
- `examples/vue-starter`: minimal scaffold with Vue fully taking over page and block UI
- `examples/react-starter`: minimal scaffold with React fully taking over page and block UI
- `examples/guestbook`: block-local refresh and submit flow
- `examples/auth-session`: login, session restore, and logout flow

These examples are intentionally small and focus on the end-to-end protocol loop.

如果你是第一次看仓库，推荐顺序是：

1. `examples/starter`
2. `examples/guestbook`
3. `examples/auth-session`
4. `examples/vue-starter` / `examples/react-starter`
5. `examples/marked-starter`

如果你是从已发布包开始新建项目，而不是从仓库里研究示例，优先走：

```bash
npm create mdsn@latest my-app
```

`create-mdsn` 当前只生成一个最小 starter。其余示例继续留在仓库里，作为进阶参考，而不是模板承诺。

## Starter

See [examples/starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/starter/src/index.ts) for the starter business module, [examples/starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/starter/dev.mjs) for the local dev shell, and [examples/starter/README.md](/Users/hencoo/projects/mdsn/examples/starter/README.md) for copy-and-run instructions.

Use this one when you want a scaffold, not a feature demo.

This starter shows:

- canonical `.md` page source in a local example directory
- minimal `composePage()` + `page.fragment()` usage
- `createNodeHost()` for Node `http`
- `@mdsnai/sdk/web` + `@mdsnai/sdk/elements` mounted with the thinnest possible shell

## Docs Site

See [examples/docs-site/src/index.ts](/Users/hencoo/projects/mdsn/examples/docs-site/src/index.ts), [examples/docs-site/dev.mjs](/Users/hencoo/projects/mdsn/examples/docs-site/dev.mjs), [examples/docs-site/pages/docs.md](/Users/hencoo/projects/mdsn/examples/docs-site/pages/docs.md), and [examples/docs-site/README.md](/Users/hencoo/projects/mdsn/examples/docs-site/README.md).

This example shows:

- using `createHostedApp()` to map docs routes to markdown page sources
- injecting a docs-specific HTML shell with custom `renderHtml`
- serving docs static assets (CSS) with `createNodeHost()`

## Express Starter

See [examples/express-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/index.ts), [examples/express-starter/src/express-adapter.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/express-adapter.ts), [examples/express-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/express-starter/dev.mjs), and [examples/express-starter/README.md](/Users/hencoo/projects/mdsn/examples/express-starter/README.md).

This example shows:

- an Express `req/res` bridge that delegates protocol logic to `server.handle()`
- form post normalization (`application/x-www-form-urlencoded` to markdown body)
- the same default headless + elements browser enhancement flow as the base starter

## Marked Starter

See [examples/marked-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/src/index.ts), [examples/marked-starter/src/client.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/src/client.ts), [examples/marked-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/marked-starter/dev.mjs), and [examples/marked-starter/README.md](/Users/hencoo/projects/mdsn/examples/marked-starter/README.md).

This example shows:

- one shared `markdownRenderer` object injected into both `@mdsnai/sdk/server` and `@mdsnai/sdk/elements`
- a real third-party library integration using `marked`
- the default UI path staying intact while Markdown rendering is swapped out

## Vue Starter

See [examples/vue-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/src/index.ts), [examples/vue-starter/src/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/src/client.ts), [examples/vue-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/vue-starter/dev.mjs), and [examples/vue-starter/README.md](/Users/hencoo/projects/mdsn/examples/vue-starter/README.md).

This example shows:

- the same thin hosted-app server shape as the base starter
- Vue consuming the `@mdsnai/sdk/web` headless bootstrap and rendering page/block UI itself
- Vue directly using a real third-party Markdown renderer instead of a handwritten parser
- `@mdsnai/sdk/web` mounted from Vue and cleaned up on unmount
- how to take over UI without reimplementing the protocol or the server runtime
- `@mdsnai/sdk/elements` becoming optional rather than required

## React Starter

See [examples/react-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/react-starter/src/index.ts), [examples/react-starter/src/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/src/client.tsx), [examples/react-starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/react-starter/dev.mjs), and [examples/react-starter/README.md](/Users/hencoo/projects/mdsn/examples/react-starter/README.md).

This example shows:

- the same thin hosted-app server shape as the base starter
- React consuming the `@mdsnai/sdk/web` headless bootstrap and rendering page/block UI itself
- React directly using a real third-party Markdown renderer instead of a handwritten parser
- `@mdsnai/sdk/web` mounted from React and cleaned up on unmount
- how to take over UI without reimplementing the protocol or the server runtime
- `@mdsnai/sdk/elements` becoming optional rather than required

## Guestbook

See [examples/guestbook/src/index.ts](/Users/hencoo/projects/mdsn/examples/guestbook/src/index.ts) for the pure SDK usage, and [examples/guestbook/demo.mjs](/Users/hencoo/projects/mdsn/examples/guestbook/demo.mjs) for the runnable local demo shell.

This example shows:

- canonical page composition from Markdown
- block-scoped action fragments
- target-first `GET` and `POST` handlers
- browser-side block refresh
- Node `http` bridging plus default UI mounting

## Auth Session

See [examples/auth-session/src/index.ts](/Users/hencoo/projects/mdsn/examples/auth-session/src/index.ts), [examples/auth-session/pages/login.md](/Users/hencoo/projects/mdsn/examples/auth-session/pages/login.md), [examples/auth-session/pages/register.md](/Users/hencoo/projects/mdsn/examples/auth-session/pages/register.md), [examples/auth-session/pages/vault.md](/Users/hencoo/projects/mdsn/examples/auth-session/pages/vault.md), and [examples/auth-session/README.md](/Users/hencoo/projects/mdsn/examples/auth-session/README.md).

This example shows:

- starter-style session scaffold with multiple canonical `.md` pages
- a default `login.md` page with a direct jump to registration
- a separate `register.md` page with a direct way back to sign in
- a protected `vault.md` flow for notes and logout
- register/login/logout via the same hosted app runtime
- full-page session transitions between public and protected page sources
- protected notes flow backed by a session cookie
- stale-session and unauthorized recovery via a block-local `GET "/login" -> recover` action
