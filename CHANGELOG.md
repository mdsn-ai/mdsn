# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-03-27

### Added

- Public docs in English and Chinese, including framework, server, React, Vue, shared-interaction, CLI, and SDK guides.
- `examples/chat` now validates the full protocol closure: login page -> session continuity -> shared chat room -> fresh-agent summary retrieval.
- Published packages:
  - `@mdsnai/sdk`
  - `create-mdsn`

### Changed

- Public protocol, SDK, and docs now use the current Markdown-fragment block model.
- `read` / `write` declared targets now map directly to HTTP addresses.
- Server-side fragment generation now uses `renderMarkdownValue()`, `serializeBlock()`, and `renderMarkdownFragment()`.
- Public web APIs now expose headless parsing through `parseMarkdown()`, `parsePage()`, and `parseFragment()`.
- Examples are consolidated under `examples/guestbook`, `examples/chat`, and `examples/react-guestbook`.
- The default starter now generates a minimal runnable site with `pages/index.md` and `server/actions.cjs`.
