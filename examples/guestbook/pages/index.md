---
id: guestbook
title: Guestbook
version: 0.4.0
description: Guestbook example built on the current protocol
---

# Guestbook

This is a minimal runnable guestbook example.

- `GET` and `POST` return fresh Markdown fragments
- the Host replaces only the current `guestbook` block region
- the main page body stays unchanged

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
