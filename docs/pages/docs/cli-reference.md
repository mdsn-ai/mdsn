---
title: CLI Reference
description: Workflow-oriented reference for mdsn create, dev, build, and start
layout: docs
---

# CLI Reference

Command name: `mdsn`

The CLI is responsible for four things:

- `create`: create a new site
- `dev`: run the development server
- `build`: build into `dist/`
- `start`: preview the built output

Read it in the same order you use it:

1. `create`
2. `dev`
3. `build`
4. `start`

## 1. `mdsn create`

When to use it:

- you want to create a new project
- you want the minimal starter

What it does:

- creates the site directory
- writes the starter files
- runs `npm install` by default

The starter currently generates:

- `package.json`
- `pages/index.md`
- `server/actions.cjs`
- `README.md`

Most common usage:

```bash
mdsn create skills-app
mdsn create --cwd demos skills-app
```

Rules:

- `create` accepts at most one target directory
- `create` does not support `--port`

## 2. `mdsn dev`

When to use it:

- you are developing pages and actions locally
- you want immediate feedback while editing

What it does:

- starts the development server
- watches `pages`, `server`, `public`, and `layouts`
- injects a minimal auto-refresh probe

Most common usage:

```bash
mdsn dev
mdsn dev --cwd docs --port 4010
mdsn dev -C docs -p 4010
```

Debug endpoints:

- `GET /__mdsn/debug`
- `GET /__mdsn/debug/site`
- `GET /__mdsn/debug/version`

Most important parameters:

- `--cwd` / `-C`
- `--port` / `-p`

## 3. `mdsn build`

When to use it:

- you want to generate `dist/`
- you want to prepare preview or deployment output

What it does:

- builds pages and site assets into `dist/`
- writes manifests
- writes serialized config

Most common usage:

```bash
mdsn build
mdsn build --cwd docs
```

Most important parameters:

- `--cwd` / `-C`

## 4. `mdsn start`

When to use it:

- you want to preview the built output locally
- you want to verify the actual production preview behavior

What it does:

- starts the production preview server
- prefers `dist/` when it exists
- falls back to source files when `dist/` is missing

Most common usage:

```bash
mdsn start
mdsn start --cwd docs --port 4010
mdsn start -C docs -p 4010
```

Most important parameters:

- `--cwd` / `-C`
- `--port` / `-p`

## 5. Argument rules

- both `--cwd=<dir>` and `--cwd <dir>` are supported
- both `--port=<n>` and `--port <n>` are supported
- `--port` is only supported by `dev` and `start`
- `dev`, `build`, and `start` do not accept positional arguments
- `create` accepts a single positional target directory

## Related pages

- [Getting Started](/docs/getting-started)
- [Framework Development](/docs/site-development)
- [Config Reference](/docs/config-reference)
