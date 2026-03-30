# Vue Starter

This example keeps the MDSN protocol and server runtime intact, but lets Vue take over the page and block UI from the browser bootstrap data.

- The server stays as small as the base starter
- Vue reads the `@mdsnai/sdk/web` headless snapshot and renders the full page itself
- Vue uses `marked` to render `snapshot.markdown` and `block.markdown`
- `@mdsnai/sdk/elements` is not required
- block refreshes still go through the same MDSN protocol loop

Run the local demo with:

```bash
npm install
npm run build
node examples/vue-starter/dev.mjs
```

Then open [http://127.0.0.1:4324/guestbook](http://127.0.0.1:4324/guestbook).
