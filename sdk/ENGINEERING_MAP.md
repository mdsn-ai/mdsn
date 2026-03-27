# SDK Engineering Map

## Scope

This file defines the current engineering layout of `sdk`.

Core facts:

- The main page body is static `md`
- `mdsn` defines mutable interaction fragments
- `read` and `write` return `md` text fragments on success
- The Host replaces only the current `mdsn:block` region
- `redirect` is the only page-level navigation primitive

## Public Entry Points

- `src/index.ts`
  - SDK root entry point
  - only aggregates stable public APIs
- `src/core/index.ts`
  - page definition and protocol model entry point
- `src/web/index.ts`
  - rendering, HTML shell, and browser runtime entry point
- `src/server/index.ts`
  - page hosting and action definition entry point
- `src/framework/index.ts`
  - app composition entry point
- `src/cli/index.ts`
  - CLI entry point

## Dependency Rules

- `cli` may depend on `framework`, `server`, `web`, and `core`
- `framework` may depend on `server`, `web`, and `core`
- `server` may depend on `core` and `web`
- `web` may depend on `core`
- `core` does not depend on `web`, `server`, `framework`, or `cli`
- each layer `index.ts` only re-exports

## Module Graph

- `core`
  - document models
  - protocol parsing
  - action result normalization
- `web`
  - page rendering
  - block region replacement
  - browser action execution
- `server`
  - page hosting
  - action wrapping
  - config and module loading
- `framework`
  - filesystem site composition
  - in-memory pages/actions composition
- `cli`
  - build/dev/start/create commands

## Active File Layout

### `src/core`

- `src/core/index.ts`
  - `core` public exports
- `src/core/model/document.ts`
  - page frontmatter
  - block anchors
  - page-level definition
- `src/core/model/block.ts`
  - block
  - `read`
  - `write`
  - `redirect`
- `src/core/model/input.ts`
  - `input` types
  - `!`
  - `secret`
- `src/core/model/schema.ts`
  - schema definitions
- `src/core/model/fragment.ts`
  - `md` fragment definitions
  - executable `mdsn` information inside fragments
- `src/core/document/frontmatter.ts`
  - frontmatter parsing
- `src/core/document/markdown.ts`
  - Markdown body parsing
  - `mdsn:block` extraction
- `src/core/document/page-definition.ts`
  - top-level page parsing entry point
- `src/core/protocol/statements.ts`
  - `input`
  - `read`
  - `write`
  - `redirect`
  - `schema`
- `src/core/protocol/mdsn.ts`
  - `mdsn` code block parsing
- `src/core/protocol/validation.ts`
  - block reference validation
  - input reference validation
  - schema validation
- `src/core/action/types.ts`
  - fragment / redirect action results
- `src/core/action/execution.ts`
  - action result normalization
- `src/core/action/index.ts`
  - action-layer exports

### `src/web`

- `src/web/index.ts`
  - `web` public exports
- `src/web/page-render.ts`
  - page render model
- `src/web/page-bootstrap.ts`
  - page bootstrap data
- `src/web/page-html.ts`
  - HTML document shell output
- `src/web/page-client-script.ts`
  - browser runtime script source
- `src/web/page-client-runtime.ts`
  - browser action loop
- `src/web/fragment-render.ts`
  - returned `md` fragment parsing
- `src/web/block-runtime.ts`
  - block region markers and replacement
- `src/web/navigation.ts`
  - `redirect` navigation
- `src/web/public-render.ts`
  - stable page rendering API
- `src/web/public-client-runtime.ts`
  - stable client script API

### `src/server`

- `src/server/index.ts`
  - `server` public exports
- `src/server/action.ts`
  - `defineAction`
- `src/server/action-host.ts`
  - action execution wrapper
- `src/server/page-host.ts`
  - page hosting
- `src/server/page-links.ts`
  - page path and link rules
- `src/server/negotiate.ts`
  - `Accept` negotiation
- `src/server/config.ts`
  - `mdsn.config` parsing
- `src/server/module-loader.ts`
  - dynamic server action loading
- `src/server/init.ts`
  - starter page templates
- `src/server/server.ts`
  - framework server compatibility entry point

### `src/framework`

- `src/framework/index.ts`
  - framework public exports
- `src/framework/create-framework-app.ts`
  - stable `createFrameworkApp` wrapper
- `src/framework/site-app.ts`
  - site composition from `rootDir`
- `src/framework/hosted-app.ts`
  - app composition from in-memory pages/actions

### `src/cli`

- `src/cli/index.ts`
  - CLI exports
- `src/cli/entry.ts`
  - CLI main entry point
- `src/cli/args.ts`
  - argument parsing
- `src/cli/commands/build.ts`
- `src/cli/commands/dev.ts`
- `src/cli/commands/start.ts`
- `src/cli/commands/create.ts`

## File Ownership Rules

- page document definitions live only in `src/core/model/*`
- protocol parsing lives only in `src/core/document/*` and `src/core/protocol/*`
- action result normalization lives only in `src/core/action/*`
- browser DOM work and block replacement live only in `src/web/*`
- HTTP, config, and filesystem loading live only in `src/server/*`
- `framework` only composes; it does not define new protocol semantics
- `cli` only composes commands; it does not define new protocol semantics

## Test Mapping

- `tests/core-*.test.ts`
  - `core`
- `tests/web-*.test.ts`
  - `web`
- `tests/server-*.test.ts`
  - `server`
- `tests/framework-*.test.ts`
  - `framework`
- `tests/docs-*.test.ts`
  - docs consistency
- `tests/sdk-exports.test.ts`
  - public export surface
