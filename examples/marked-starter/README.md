# MDSN Marked Starter

这是一个最小可运行的第三方 Markdown 渲染器接入示例。

它做的事情很简单：

- `server` 通过同一个 `markdownRenderer` 输出 browser HTML
- `elements` 通过同一个 `markdownRenderer` 渲染默认 UI
- agent 路径仍然保持原始 `md + mdsn`，不受 HTML renderer 影响
- 第三方库使用的是 `marked`

## 启动

先在仓库根目录执行：

```bash
npm install
npm run build
node examples/marked-starter/dev.mjs
```

然后打开：

- `http://127.0.0.1:4326/guestbook`

## 目录

- `pages/guestbook.md`
  - canonical 页面源
- `src/index.ts`
  - server 侧接入 `marked`
- `src/client.ts`
  - default elements 侧接入 `marked`
- `dev.mjs`
  - 本地开发壳
