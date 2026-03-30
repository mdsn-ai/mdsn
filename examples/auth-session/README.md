# MDSN Auth Session Example

这是一个 starter 风格的 session 示例。

## 目录

- `pages/login.md`
  - 默认登录页，只暴露登录和跳去注册
- `pages/register.md`
  - 注册页，只暴露注册和返回登录
- `pages/vault.md`
  - 登录后页面源，暴露 session 和 private notes
- `src/index.ts`
  - 用户、笔记和 session 业务逻辑
- `src/client.ts`
  - 默认 UI 挂载入口，走 `createHeadlessHost() + mountMdsnElements()`
- `dev.mjs`
  - 本地开发壳，基于 `createNodeHost()`

## 启动

先在仓库根目录执行：

```bash
npm install
npm run build
node examples/auth-session/dev.mjs
```

然后打开：

- `http://127.0.0.1:4323/login`

## 这份示例在验证什么

1. 页面源仍然是 `.md`
2. `createHostedApp()` 的显式 action binding 能承载 session 场景
3. 登录、注册、受保护操作、登出都走同一套 MDSN 协议
4. 默认是登录页，注册页和登录页互相跳转；登录或注册成功后整页切到 `vault.md`
