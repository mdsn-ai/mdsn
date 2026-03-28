---
id: react-guestbook
title: React Guestbook
description: Headless API powered guestbook rendered with custom React components
---

# React Guestbook

This demo uses the headless MDSN API in a custom React UI.

- The page source stays in Markdown
- The block stays in `mdsn`
- The client renders containers and the guestbook block with its own components

<!-- mdsn:block guestbook -->

```mdsn
block guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
