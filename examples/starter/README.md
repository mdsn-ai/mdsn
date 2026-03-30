# MDSN Starter

这是一个最小可运行的 MDSN 脚手架。

## 目录

- `pages/guestbook.md`
  - 你的 canonical 页面源
- `src/index.ts`
  - 你的业务逻辑
- `src/client.ts`
  - 默认 UI 挂载入口，走 `createHeadlessHost() + mountMdsnElements()`
- `dev.mjs`
  - 本地开发壳，基于 `createNodeHost()`

## 启动

先在仓库根目录执行：

```bash
npm install
npm run build
node examples/starter/dev.mjs
```

然后打开：

- `http://127.0.0.1:4322/guestbook`

## 你通常只需要改这三处

1. `pages/guestbook.md`
2. `src/index.ts` 里的业务状态
3. `src/index.ts` 里的显式 action binding 和 handler

## 当前推荐边界

- 页面源放 `.md`
- 运行时 block 内容用 `composePage()`
- hosted app 里的 action 显式声明 `target / methods / routePath / blockName`
- 浏览器侧默认链路走 `createHeadlessHost() + mountMdsnElements()`
- Node 开发壳用 `createNodeHost()`
