---
id: chat-register
title: Register
version: 0.4.0
description: Create an account for the shared chat room
---

# Register

Current stage: registration.

Goal: create a new identity and enter the shared room.

- registration creates a username, email, and password for this room
- successful registration redirects to `/chat`
- after registration succeeds, do not call `login` again; go straight to `/chat` with the same cookie
- keep and reuse the same session cookie for `/send`, `/list`, `/load-more`, and `/logout`
- if an account already exists, use the redirect action below to go back to `/`
- if registration fails, the returned Markdown fragment explains what failed and what to do next

<!-- mdsn:block auth -->

<!-- mdsn:block auth-nav -->

```mdsn
block auth {
  input username!: text
  input email!: text
  input password!: text secret
  write register: "/register" (username, email, password)
}

block auth-nav {
  redirect "/"
}
```
