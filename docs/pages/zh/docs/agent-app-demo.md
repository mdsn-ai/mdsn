---
title: Agent App Demo 讲解
description: 以 chat demo 讲清楚 MDSN 的 agent app 完整闭环
layout: docs
---

# Agent App Demo 讲解

`chat` demo 是当前最能完整展示 MDSN 价值的一条主线。

它证明了下面这件事：

- 人类可以在浏览器里打开同一个页面
- 一个全新的 Agent 也可以把同一个页面当成 Markdown 来读取
- 双方看到的是同一套交互结构
- 双方都可以从同一套 Markdown fragment 更新里继续操作

这也是为什么我们把 MDSN 描述成 **agent apps** 和 **skills apps** 的基础。

这个 demo 最重要的地方，不只是“页面能交互”，而是页面本身就像一层共享提示词：

- 每一页都会明确告诉 Agent 当前处于哪个阶段
- 每一页都会明确告诉 Agent 当前目标是什么
- 每一页都会明确告诉 Agent 下一步该执行哪个动作
- 每一次可恢复失败都会返回新的 Markdown fragment，并把下一步写清楚

## 这个 demo 证明了什么

这个 demo 证明了一条完整闭环：

1. 新访客先进入登录页
2. 如果还没有账号，页面会显式给出跳转到注册页的动作
3. 注册成功后会 `redirect` 到 `/chat`
4. 登录成功后也会 `redirect` 到 `/chat`
5. 聊天页支持发消息、刷新、加载更多历史、退出登录
6. 可恢复失败会返回新的 Markdown fragment，而不是只停留在前端私有状态里

这意味着一个 fresh agent 不需要额外接管，就可以完成整套流程。

## demo 里有哪些页面

这个 demo 使用了三个页面：

- `/`
  - 登录页
- `/register`
  - 注册页
- `/chat`
  - 单房间聊天页

这些页面本质上仍然是 Markdown 页面，只是其中包含可执行的 `mdsn` block。

## 1. 登录页

登录页需要两个字段：

- `email`
- `password`

同时它还暴露了一个单独的导航 block，用来跳转到 `/register`。

这点对 Agent 很重要，因为页面没有把“去注册”藏在前端私有状态里，而是直接把当前阶段、当前目标和下一步动作写了出来。

## 2. 注册页

注册页需要三个字段：

- `username`
- `email`
- `password`

它同样暴露了一个导航 block，可以跳回 `/`。

如果注册成功，action 会返回一个 `redirect /chat`。

如果注册失败，action 会返回一个新的 Markdown fragment，直接说明：

- 哪一步失败了
- 为什么失败
- 下一步该怎么做

## 3. 聊天页

聊天页是一个单房间 agent app。

它显式暴露这些动作：

- `send`
  - 发送新消息
- `refresh`
  - 读取当前最新房间状态
- `load_more`
  - 通过 `/load-more` 读取更早的历史消息，扩大上下文窗口
- `logout`
  - 结束当前会话并回到 `/`

默认聊天页只显示最近 `50` 条消息。如果人类或 Agent 需要更深的上下文，就执行 `load_more`。

这也是这个 demo 开始和普通 HTML 应用拉开差距的地方。页面会直接告诉 Agent：

- 你现在已经处在共享房间里
- 当前只看到了最近 `50` 条消息
- `refresh` 用来重读当前状态
- `load_more` 用来扩上下文窗口
- `logout` 用来结束当前会话

## 为什么它对 Agent 友好

这个 demo 不是一个只能给浏览器看的页面，而是被设计成 Agent 可以直接操作的 app。

关键原因是：

- 页面内容可以直接以 Markdown 形式读取
- 页面正文本身就携带任务和状态说明
- `read`、`write`、`redirect` 都是显式声明的
- action target 是可直接调用的 HTTP 地址
- 成功更新返回 Markdown fragment
- 可恢复失败也返回 Markdown fragment

换句话说，这里的页面内容不只是展示内容，它同时也是提供给 Agent 的共享提示上下文。

## 失败处理怎么做

这个 demo 在鉴权和聊天两条链路上都遵循同一个原则：

- 可恢复失败不只是本地表单错误
- 而是返回一个新的 Markdown fragment
- fragment 里要明确说明当前问题和下一步动作

例如：

- 登录失败
  - fragment 会明确说明当前邮箱和密码没有匹配的账号
- 注册失败
  - fragment 会明确说明当前身份已注册
- 发送失败
  - fragment 会明确说明发送前必须先输入消息

这样一来，人和 Agent 都能在同一页状态里继续恢复流程。

## 人类与 Agent 为什么能共用同一个 demo

这背后的技术基础是 HTTP 内容协商：

- 页面请求
  - 浏览器使用 `Accept: text/html`
  - Agent 使用 `Accept: text/markdown`
- action 请求
  - Agent 用 `Accept: text/markdown` 获取 fragment 更新
  - Host runtime 在需要时用 `Accept: application/json`

也正是因为这层内容协商成立，同一个页面模型才能同时支持：

- human-agent collaboration
- direct agent operation
- skills apps
- agent apps

## 接下来可以看什么

- [快速开始](/zh/docs/getting-started)
- [基础开发框架](/zh/docs/site-development)
- [HTTP 内容协商与共享交互](/zh/docs/shared-interaction)
- [服务端开发](/zh/docs/server-development)
