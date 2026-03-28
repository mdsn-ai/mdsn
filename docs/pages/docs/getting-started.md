---
title: Getting Started
description: Create and run your first MDSN site
layout: docs
---

# Getting Started

## 1. Create a site

```bash
npm create mdsn@latest skills-app
cd skills-app
```

## 2. Starter structure

The minimal site structure is:

```text
package.json
pages/index.md
server/actions.cjs
```

The two directories you use first are:

- `pages/`: page Markdown
- `server/`: action files

## 3. Add a guestbook page

`pages/index.md`:

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

This is a minimal runnable guestbook.

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

This page defines:

- one static Markdown page body
- one `mdsn:block guestbook` replacement region
- one `block guestbook` interaction definition

## 4. Add server actions

`server/actions.cjs`:

```js
const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
} = require("@mdsnai/sdk/server");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

function getGuestbookStore() {
  if (!globalThis.__mdsnQuickstartGuestbookMessages) {
    globalThis.__mdsnQuickstartGuestbookMessages = [];
  }

  return globalThis.__mdsnQuickstartGuestbookMessages;
}

function listGuestbookMessages() {
  return getGuestbookStore().map((entry) => ({ ...entry }));
}

function renderGuestbookFragment(messages) {
  return renderMarkdownFragment({
    body: [
      "## Messages",
      messages.length > 0
        ? renderMarkdownValue(
            "list",
            messages.map((entry) => `**${entry.nickname}**: ${entry.message}`),
          )
        : "_No messages yet._",
    ],
    block: guestbookBlock,
  });
}

function addGuestbookMessage(message) {
  const store = getGuestbookStore();
  store.unshift({ nickname: message.nickname, message: message.message });
  return store[0];
}

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
  post: defineAction({
    async run(ctx) {
      const nickname = String(ctx.inputs.nickname ?? "").trim() || "Guest";
      const message = String(ctx.inputs.message ?? "").trim();

      if (!message) {
        return {
          ok: false,
          errorCode: "EMPTY_MESSAGE",
          fieldErrors: { message: "Please enter a message." },
        };
      }

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
});
```

## 5. Start development

```bash
npm run dev
```

Default URL:

```text
http://localhost:3000/
```

## 6. Add more only when needed

- add `mdsn.config.cjs` when you need custom site settings
- add `layouts/default.html` when you want a custom page shell
- add `public/` when you need static assets

## 7. Common commands

- Development: `npm run dev`
- Build: `npm run build`
- Preview: `npm run start`

## Related pages

- [Action Reference](/docs/action-reference)
- [SDK Reference](/docs/sdk-reference)
- [Framework Development](/docs/site-development)

For a stronger end-to-end validation flow, see `examples/chat/`:

- login page -> `GET "/chat" -> enter_chat` -> chat page
- cookie session continues after login
- multiple fresh agents can share one room context
- a new fresh agent can read the current fragment and summarize the conversation
