---
title: Getting Started
description: Create and run your first MDSN site
layout: docs
---

# Getting Started

When you are new to MDSN, understand one minimal page first, then run the starter.

## 1. See one minimal page first

`pages/index.md`:

````mdsn-src
---
id: guestbook
title: Guestbook
---

# Guestbook

This is a minimal runnable guestbook page.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

You only need to understand three things here:

- the Markdown body is still just page content
- the `mdsn:block` anchor marks the region replaced at runtime
- `BLOCK guestbook { ... }` defines the inputs and actions for that region

## 2. See the matching minimal action file

`server/actions.cjs`:

```js
const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
} = require("@mdsnai/sdk");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderMarkdownFragment({
        body: ["## Messages", "_No messages yet._"],
        block: guestbookBlock,
      });
    },
  }),
});
```

The one thing to remember here is:

- action handlers return Markdown fragments, and the host replaces the current block region with them

## 3. Create a site now

```bash
npm create mdsn@latest skills-app
cd skills-app
```

## 4. Starter structure

The minimal site structure is:

```text
package.json
pages/index.md
server/actions.cjs
```

The two directories you use first are:

- `pages/`: page Markdown
- `server/`: action files

## 5. Fill in the server actions

`server/actions.cjs`:

```js
const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
} = require("@mdsnai/sdk");

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
        return renderMarkdownFragment({
          body: [
            "## Action Status",
            "Please enter a message before submitting.",
          ],
          block: guestbookBlock,
        });
      }

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
});
```

## 6. Start development

```bash
npm run dev
```

Default URL:

```text
http://localhost:3000/
```

## 7. What you have now

- one site driven by a Markdown page
- one action file that serves declared targets such as `GET /list` and `POST /post`
- one default host that can return both HTML pages and Markdown fragments

## 8. Add more only when needed

- add `mdsn.config.cjs` when you need custom site settings
- add `layouts/default.html` when you want a custom page shell
- add `public/` when you need static assets

## 9. Common commands

- Development: `npm run dev`
- Build: `npm run build`
- Preview: `npm run start`

## Where to go next

- stay on the starter + framework path: [Framework Development](/docs/site-development)
- plug MDSN into your own server: [Server Development](/docs/server-development)
- choose another integration route: [Developer Paths](/docs/developer-paths)

## Related pages

- [Action Reference](/docs/action-reference)
- [Developer Paths](/docs/developer-paths)
- [SDK Reference](/docs/sdk-reference)
- [Framework Development](/docs/site-development)

For a stronger end-to-end validation flow, see `examples/chat/`:

- login page -> `GET "/chat" -> enter_chat` -> chat page
- cookie session continues after login
- multiple fresh agents can share one room context
- a new fresh agent can read the current fragment and summarize the conversation
