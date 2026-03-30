---
title: 配置参考
description: MDSN 运行时集成中的核心配置入口。
---

# 配置参考

## `createHostedApp(options)`

常用项：

- `pages`
- `actions`
- `markdownRenderer`
- `renderHtml`

## `createNodeHost(server, options)`

常用项：

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`

## `createHeadlessHost(options)`

- `root`
- `fetchImpl`

## `mountMdsnElements(options)`

- `root`
- `host`
- `markdownRenderer`
