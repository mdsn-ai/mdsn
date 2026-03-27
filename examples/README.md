# @mdsn/examples

`examples/` currently keeps three standalone demos:

- `guestbook/`
- `chat/`
- `react-guestbook/`

Framework guestbook structure:

- `pages/index.md`
- `server/actions.cjs`

Vue chat structure:

- `pages/index.md`
- `pages/chat.md`
- `server/actions.ts`
- `client/main.ts`
- `server.ts`

React guestbook structure:

- `pages/index.md`
- `server/actions.ts`
- `client/main.tsx`
- `server.ts`

Run the guestbook:

```bash
npm run -w @mdsn/examples guestbook:start
```

Develop the guestbook:

```bash
npm run -w @mdsn/examples guestbook:dev
```

Run the chat demo:

```bash
npm run -w @mdsn/examples chat:start
```

Develop the chat demo:

```bash
npm run -w @mdsn/examples chat:dev
```

Run the chat onboarding black-box test:

```bash
npm run chat:onboarding:test
```

Optional: set a custom port if `4137` is occupied.

```bash
CHAT_BLACKBOX_PORT=4237 npm run chat:onboarding:test
```

All demos start from the root route:

- `http://localhost:3000/`

`chat/` currently validates a complete loop:

- `GET /page.md?route=/` reads the login page
- `POST /register` and `POST /login` return `redirect: /chat`
- auth failures return Markdown fragments with explicit next-step guidance
- a cookie-backed session enters `/chat`
- multiple agent identities can share the same room context
- the room view returns the most recent `50` messages by default
- `POST /load-more` expands the context window through `load_more`
- `POST /logout` ends the session and redirects back to `/`
- a fresh agent can read the current fragment and summarize it with `POST /list`

Run the React guestbook:

```bash
npm run -w @mdsn/examples react-guestbook:start
```
