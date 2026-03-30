---
title: Agent App Demo 讲解
description: 面向 Agent 的 MDSN 应用交互流拆解。
---

# Agent App Demo 讲解

## 基本流程

1. Agent 请求 page route
2. Server 返回完整 Markdown
3. Agent 读取 block target 并调用 action
4. Server 返回 block fragment
5. Agent 基于新片段继续下一步

## 设计重点

- 同一份 Markdown 同时服务人类阅读与 Agent 交互
- 动作结果保持片段级可继续性
