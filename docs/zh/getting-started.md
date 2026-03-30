---
title: 快速开始
description: 用 @mdsnai/sdk 快速跑起你的第一个 MDSN 应用。
---

# 快速开始

## 方式 A：从发布模板创建

```bash
npm create mdsn@latest my-app
cd my-app
npm install
npm run start
```

默认打开 `http://127.0.0.1:3000/`（以实际输出端口为准）。

## 方式 B：从仓库本地启动

```bash
npm install
npm run build
npm test
```

然后运行任一 `examples/*/dev.mjs`。

## 模板结构

- `app/guestbook.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## 下一步

- [开发者路线图](/zh/docs/developer-paths)
- [SDK 概览](/zh/docs/sdk)
- [示例](/zh/docs/examples)
