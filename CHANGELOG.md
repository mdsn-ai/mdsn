# Changelog

All notable changes to this project will be documented in this file.

This changelog starts at `0.4.0`. Earlier releases were not backfilled.

## SDK 0.4.3 - 2026-04-03

### Fixed

- Root-mounted static files now resolve correctly from top-level paths in both the Node and Bun host adapters
- Host adapter coverage now includes regression tests for top-level static file serving

## 0.4.5 - 2026-04-02

### Changed

- `@mdsnai/sdk` is now published as `0.4.2`, adding explicit `auto` operations that are resolved by the server host before returning the final result
- `auto` resolution now stays consistent across agent and browser consumers, and `label` no longer carries implicit execution behavior
- `create-mdsn` is now published as `0.4.5` and continues to generate `@mdsnai/sdk: ^0.4.0` for the current `0.4.x` starter line
- `create-mdsn` no longer pins `@mdsnai/sdk` as its own direct runtime dependency

## 0.4.4 - 2026-04-02

### Changed

- Published `create-mdsn` metadata is being refreshed in a standalone patch release so npm package-page behavior can be verified independently of SDK changes

## 0.4.3 - 2026-04-01

### Changed

- `create-mdsn` now pins generated apps to the compatible `@mdsnai/sdk` minor series instead of writing `latest`
- `0.4.x` starters now generate `@mdsnai/sdk: ^0.4.0`

## 0.4.2 - 2026-04-01

### Fixed

- `create-mdsn` now executes correctly when package managers launch the published bin through a symlinked entrypoint
- Published CLI execution now uses a dedicated bin entry instead of relying on fragile main-module detection

## 0.4.1 - 2026-04-01

### Fixed

- `create-mdsn` now starts correctly when invoked through `bunx`
- Published Bun scaffold verification now covers the registry-installed starter path

## 0.4.0 - 2026-04-01

### Added

- Official Node and Bun runtime support for the MDSN SDK
- New runtime adapter entrypoints: `@mdsnai/sdk/server/node` and `@mdsnai/sdk/server/bun`
- A Bun-native host adapter with dedicated SDK coverage
- Runtime-aware starter scaffolding in `create-mdsn`
- Node and Bun release smoke coverage
- Root-level license source with per-package prepack syncing

### Changed

- `create-mdsn` now scaffolds either a Node or Bun starter
- `bunx create-mdsn` defaults to the Bun starter
- `npm create mdsn@latest` and `npx create-mdsn` default to the Node starter
- SDK documentation now describes the shared server runtime separately from runtime-specific host adapters
- In-repo examples now import the explicit Node host adapter from `@mdsnai/sdk/server/node`

### Fixed

- CLI runtime override parsing now supports npm's `--` argument separator
- Published `create-mdsn` packages now include the split starter template directories
- Bun smoke execution now propagates the Bun binary path correctly during starter startup
