# MDSNv Docs Site Example

This is a minimal docs website example built with MDSNv runtime primitives.

## What It Demonstrates

- Markdown pages as canonical docs content
- Route-to-page mapping through `createHostedApp()`
- Custom docs HTML shell injected via `renderHtml`
- Static docs CSS served by `createNodeHost()`

## Run

From the repository root:

```bash
npm install
npm run build
node examples/docs-site/dev.mjs
```

Open:

- `http://127.0.0.1:4332/docs`
