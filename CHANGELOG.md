# Changelog

All notable changes to this project will be documented in this file.

This changelog starts at `0.4.0`. Earlier releases were not backfilled.

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
