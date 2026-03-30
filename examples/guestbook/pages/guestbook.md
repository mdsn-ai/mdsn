---
title: "Guestbook"
---

# Guestbook

Leave a short message and refresh the block to see the latest entries.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
