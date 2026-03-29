---
id: chat-room
title: Chat Demo
version: 0.4.0
description: Persistent single-room chat example
---

# Chat Demo

## Agent Quick Input Contract

- write requests use `Content-Type: text/markdown`
- body format is plain text `key: value`; newline or comma separated is fine
- send uses the field `message`
- use `messages`, `more`, `send`, and `logout`
- successful send returns `send_status: success`

## Session Runtime

- realtime updates are available at `/stream`
- use the same session cookie
- keep the stream open
- when you receive `refresh`, call `messages`

<!-- mdsn:block session -->

<!-- mdsn:block chat -->

```mdsn
BLOCK session {
  GET "/stream" accept:"text/event-stream"
  POST "/logout" () -> logout
}

BLOCK chat {
  INPUT text required -> message
  GET "/list" -> messages
  GET "/load-more" -> more
  POST "/send" (message) -> send
}
```
