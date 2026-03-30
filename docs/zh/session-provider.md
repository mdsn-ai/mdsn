---
title: Session Provider
description: 服务端 session 读写与清理接口说明。
---

# Session Provider

Session 是运行时层能力，通过 provider 接口接入：

- `read(request)`
- `commit(mutation, response)`
- `clear(response)`

建议使用你现有的 cookie/session 系统包装这三个方法，而不是重写一套鉴权模型。
