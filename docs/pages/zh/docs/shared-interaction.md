---
title: HTTP 内容协商与共享交互
description: 为什么 MDSN 能让人类和 Agent 共用同一套页面交互
layout: docs
---

# HTTP 内容协商与共享交互

这篇文档讲的是 MDSN 最重要的一层基础：

- 为什么同一个页面既能给人看，也能给 AI agents 读
- 为什么同一个 action 既能给浏览器跑，也能给 Agent 调
- 为什么这件事成立之后，人类和 Agent 才能真正共用同一套页面模型

这也是 skills apps、agent apps、human-agent collaboration 和 agentic workflows 能成立的基础。

## 1. 先看问题本身

传统网页里，常见的分工是：

- HTML 给人类浏览器渲染
- API 给机器调用

问题是，AI agents 与 agentic workflows 通常要同时碰这两层：

- 先理解页面内容
- 再找到可执行操作
- 再调 API
- 再把 API 结果重新理解成页面状态

这中间通常会出现很多临时拼接的胶水逻辑，尤其是在 AI workflow automation 场景里。

MDSN 做的事情，就是把这层交互层明确下来。

更进一步说，在 MDSN 里，页面内容不只是展示内容，它同时也是提供给 Agent 的共享提示上下文。同一份 Markdown 源既能描述当前任务，也能描述当前状态和下一步可执行动作，而不需要 Agent 再从 HTML 或隐藏的前端状态里反推语义。

## 2. 页面为什么能同时给人和 Agent

同一路径的页面资源，支持两种内容协商结果：

- `Accept: text/markdown`
- `Accept: text/html`

含义是：

- `text/markdown`
  - 返回页面原始 Markdown
  - 适合 AI agents、调试、静态检查
- `text/html`
  - 返回页面 HTML 承载结果
  - 适合浏览器直接打开

也就是说：

- Agent 看到的是页面源表示
- 人类看到的是页面承载实现
- 两者来自同一个页面模型

## 3. action 为什么也能同时给人和 Agent

`read` / `write` 的 target 是可直接调用的 HTTP 地址。

在 HTTP Host 中：

- `read` 使用 `GET`
- `write` 使用 `POST`

请求体推荐使用 Markdown 键值行：

```md
nickname: "Guest"
message: "Hello"
```

成功响应按 Markdown-first 返回：

- `Accept: text/markdown`
  - 返回新的 Markdown fragment

这意味着：

- Agent 可以直接拿 Markdown fragment 继续操作
- 浏览器 runtime 可以拿 HTML 片段更新当前页面

这种共享承载方式，正是 skills apps、agent apps 和 human-agent collaboration 页面成立的前提。

## 4. session 是运行时契约，不是语法关键字

MDSN 协议语法保持极简：

- `BLOCK`
- `INPUT`
- `GET`
- `POST`

session / auth 状态不放进语法关键字，而是放在 HTTP 运行时里处理。

常见做法：

- 登录/注册成功后服务端返回 `Set-Cookie`
- 后续请求由客户端/agent 回放 `Cookie`
- 未登录时返回 `401 + Markdown 引导片段`

也就是说：

- 不需要新增 session 语法
- 会话状态在传输层行为里显式表达
- agent 仍然靠 Markdown 提示继续下一步

## 5. 一条完整链路长什么样

以一个最小 guestbook 为例：

页面里声明：

````mdsn-src
```mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
```
````

对 Agent 来说，一条完整链路是：

1. `GET /guestbook` with `Accept: text/markdown`
2. 读取页面正文和 `mdsn` 声明
3. 发现 `/list` 与 `/post`
4. `POST /post`
5. `Accept: text/markdown` 拿到新的 fragment
6. 继续基于这个 fragment 操作

对浏览器来说，一条完整链路是：

1. `GET /guestbook` with `Accept: text/html`
2. 打开页面
3. 触发 `read` / `write`
4. 以 `Accept: text/html` 调 action
5. Host runtime 更新当前 block

两边的区别只是承载形式不同，不是协议模型不同。

## 6. 这为什么是“共享交互”

共享交互成立的前提，不是“人和 Agent 都能访问同一个网址”。

真正的前提是：

- 人类和 Agent 面对的是同一个页面模型
- 页面里的操作声明是一致的
- action 的 target 是一致的
- 成功后的新状态仍然回到同一个 Markdown 模型里

所以 MDSN 不是做一套人类页面，再做一套 Agent 专用协议。

它做的是：

- 一个页面模型
- 两种承载形式
- 一套可继续执行的交互结构

## 7. 和协议模型的关系

这件事和当前 MDSN 模型是连在一起的：

- 页面正文是静态 Markdown
- `mdsn:block` 是可替换区域
- `GET` / `POST` 成功后返回新的 Markdown fragment
- 页面跳转通过显式的 `GET "<path>" -> <name>` 动作表达

如果没有 HTTP 内容协商：

- Agent 只能拿 HTML 猜页面语义
- 或只能绕过页面直接调内部 API

有了这层协商之后：

- Agent 可以先读页面 Markdown
- 再直接调用页面里声明的 target
- 再继续消费新的 Markdown fragment

这就是 MDSN 能让人类和 Agent 共用同一套页面交互的前提。

## 相关页面

- [Action 参考](/zh/docs/action-reference)
- [服务端开发](/zh/docs/server-development)
