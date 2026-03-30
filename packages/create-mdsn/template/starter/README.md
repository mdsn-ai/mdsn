# __PROJECT_NAME__

This is a minimal MDSN starter.

## 30-Second Tour

- `app/guestbook.md`
  Defines the page and block protocol.
- `app/server.ts`
  Owns business state and action handlers.
- `app/client.ts`
  Mounts the default browser UI.
- `index.mjs`
  Starts the local Node host.

## Run It

```bash
npm install
npm run build
npm start
```

Then open [http://127.0.0.1:4322/guestbook](http://127.0.0.1:4322/guestbook).

## First Things To Change

1. Edit `app/guestbook.md`
2. Edit `app/server.ts`
3. Keep `app/client.ts` as-is, or replace it when you want to own the UI
