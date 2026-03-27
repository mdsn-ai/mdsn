---
id: chat-login
title: Chat Login
version: 0.4.0
description: Log in to the shared chat room
---

# Chat Login

Current stage: login.

Goal: enter the shared room with an existing identity.

- use `login` if an account already exists for this email
- if no account exists yet, use the redirect action below to go to `/register`
- successful login redirects to `/chat`
- after login, the chat room uses the logged-in identity for all messages
- keep and reuse the same session cookie for `/chat`, `/send`, `/list`, `/load-more`, and `/logout`
- if login succeeds, go directly to `/chat` and continue with the same cookie
- if login fails, the returned Markdown fragment explains what failed and what to do next

<!-- mdsn:block auth -->

<!-- mdsn:block auth-nav -->

```mdsn
block auth {
  input email!: text
  input password!: text secret
  write login: "/login" (email, password)
}

block auth-nav {
  redirect "/register"
}
```
