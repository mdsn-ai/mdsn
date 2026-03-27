---
id: guestbook
title: Guestbook
version: 0.4.0
description: Guestbook example built on the current protocol
---

# Guestbook

This is a minimal runnable guestbook example.

- `read` and `write` return fresh Markdown fragments
- the Host replaces only the current `guestbook` block region
- the main page body stays unchanged

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  input nickname: text
  input message!: text
  read refresh: "/list"
  write submit: "/post" (nickname, message)
}
```
