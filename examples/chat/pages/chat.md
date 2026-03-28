---
id: chat-room
title: Chat Demo
version: 0.4.0
description: Persistent single-room chat example
---

# Chat Demo

Current stage: shared room.

Goal: continue the room conversation with the current logged-in identity.

- use `messages` to refresh the current window
- use `more` to load older messages
- use `send` to post a new message
- use `logout` to end the session

<!-- mdsn:block session -->

<!-- mdsn:block chat -->

```mdsn
block session {
  POST "/logout" () -> logout
}

block chat {
  INPUT text required -> message
  GET "/list" -> messages
  GET "/load-more" -> more
  POST "/send" (message) -> send
}
```
