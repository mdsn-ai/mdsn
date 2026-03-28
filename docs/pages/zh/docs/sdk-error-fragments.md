---
title: SDK 错误提示片段
description: SDK Host 层内建返回的失败提示片段清单
layout: docs
---

# SDK 错误提示片段

这页整理的是 SDK 自己会生成的失败提示片段。

范围：

- framework/host 运行时（`createHostedApp`）
- `@mdsnai/sdk/server` 提供的 session / 登录引导 helper
- SDK 内部处理的协议/传输失败

不包含：

- 你在业务 action 里自行返回的失败提示片段

## 1. 契约总览

- action handler 统一返回 Markdown fragment（业务失败也一样）
- SDK host 对 framework/协议错误会包装成 Markdown 提示片段
- 这些 SDK 失败片段里没有协议级 `errorCode` 字段

建议：

- 机器判断看 HTTP 状态码
- agent/人类继续操作看 Markdown 提示正文

## 2. SDK 内建失败片段清单

| 类型 | HTTP 状态 | 触发场景 | 默认片段正文 | 源码位置 |
| --- | --- | --- | --- | --- |
| `actionNotAvailable` | `404` | 页面声明了 action target，但服务端没有对应 handler | `## Action Status` + `This action is not available on the current server.` | `sdk/src/framework/hosted-app.ts` |
| `unsupportedContentType` | `415` | `POST` action 请求不是 `Content-Type: text/markdown` | `## Action Status` + `Unsupported content type for write action.` + 重发提示 | `sdk/src/framework/hosted-app.ts` |
| `internalError` | `500` | action 未捕获异常（包括返回值类型不合法） | `## Action Status` + `The action failed due to an internal error.` + 原始错误消息 | `sdk/src/framework/hosted-app.ts` |
| `authRequired` | `401` | 应用/session 需要登录引导 | `## Login Status` + `Login required: sign in before continuing.` | `sdk/src/server/error-fragments.ts` |


补充：

- action 返回值类型不合法时，会出现 `500` 片段，消息为：`Invalid action result: expected markdown string`
- 这条消息来自 `executeActionHandler()`，再由 hosted-app 包装成片段

## 3. SDK Helper

从 `@mdsnai/sdk/server` 可直接使用：

- `renderErrorFragment()`
- `renderActionNotAvailableFragment()`
- `renderUnsupportedContentTypeFragment()`
- `renderInternalErrorFragment()`
- `renderAuthRequiredFragment()`

这些 helper 返回的仍然都是 Markdown 片段；没有 JSON 错误包装。

## 4. 应用层 Override

`createHostedApp()` / `createSiteApp()` / `createFrameworkApp()` 现在支持：

```ts
errorFragments: {
  actionNotAvailable?: (ctx) => string;
  unsupportedContentType?: (ctx) => string;
  internalError?: (ctx) => string;
}
```

适合保留默认 HTTP 状态，但把提示词改成应用自己的表达。

session / 登录失败仍建议应用层自己生成 auth fragment，再通过 `requireSessionFromCookie()` 返回。

## 5. 不是片段的错误响应

以下是错误响应，但不是 Markdown 提示片段：

- `404 text/plain` `Not Found`（`createHostedApp` 路由兜底）
- `406 text/plain` `Not Acceptable`（`renderHostedPage` 的 `Accept` 不支持）

## 6. 有没有对应错误码？

当前没有协议层错误码映射。

- 响应体里没有 `errorCode`
- 响应体里没有 `fieldErrors`
- 统一依赖 `HTTP 状态码 + Markdown 提示正文`

## 相关页面

- [SDK 参考](/zh/docs/sdk-reference)
- [服务端开发](/zh/docs/server-development)
- [Action 参考](/zh/docs/action-reference)
