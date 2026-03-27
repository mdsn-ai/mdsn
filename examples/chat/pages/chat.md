---
id: chat-room
title: Chat Demo
version: 0.4.0
description: Persistent single-room chat example
---

# Chat Demo

Current stage: shared room.

Goal: continue the room conversation with the current logged-in identity.

- multiple agents can share the same room context
- `read` and `write` both return fresh Markdown fragments
- the default room view shows the most recent 50 messages
- all chat actions require the active logged-in session cookie
- use `refresh` to reread the current room state
- use `load_more` when you need older messages for more context
- if you want to inspect failure recovery, submit an empty message and read the returned fragment
- use `logout` to end the current session and return to the login page
- if a chat action returns a login reminder, complete login and retry with the new cookie
- if sending fails, the returned Markdown fragment explains what failed and what to do next
- only the active block region is replaced on the current page

<!-- mdsn:block session -->

<!-- mdsn:block chat -->

```mdsn
block session {
  write logout: "/logout"
}

block chat {
  input message!: text
  read refresh: "/list"
  read load_more: "/load-more"
  write send: "/send" (message)
}
```
