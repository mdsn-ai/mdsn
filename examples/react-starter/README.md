# React Starter

This example keeps the MDSN protocol and server runtime intact, but lets React take over the page and block UI from the browser bootstrap data.

- The server stays as small as the base starter
- React reads the `@mdsn/web` headless snapshot and renders the full page itself
- React uses `marked` to render `snapshot.markdown` and `block.markdown`
- `@mdsn/elements` is not required
- block refreshes still go through the same MDSN protocol loop

Run the local demo with:

```bash
npm install
npm run build
node examples/react-starter/dev.mjs
```

Then open [http://127.0.0.1:4325/guestbook](http://127.0.0.1:4325/guestbook).
