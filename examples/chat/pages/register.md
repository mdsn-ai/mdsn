---
id: chat-register
title: Register
version: 0.4.0
description: Create an account for the shared chat room
---

# Register

## Agent Quick Input Contract

- write requests use `Content-Type: text/markdown`
- body format is plain text `key: value`; newline or comma separated is fine
- use `username`, `email`, and `password`
- after success, follow the returned fragment with the same cookie
- if the account already exists, use `go_login`

<!-- mdsn:block auth -->

<!-- mdsn:block auth-nav -->

```mdsn
block auth {
  INPUT text required -> username
  INPUT text required -> email
  INPUT text secret required -> password
  POST "/register" (username, email, password) -> register
}

block auth-nav {
  GET "/" -> go_login
}
```
