---
title: HTTP 内容协商与共享交互
description: 解释 markdown/html/event-stream 协商与 agent/browser 共享交互模型。
---

# HTTP 内容协商与共享交互

MDSN 通过 `Accept` 协商支持多种表示：

- `text/event-stream`
- `text/markdown`
- `text/html`

## `q` 权重

支持标准 `q` 加权协商，例如：

```http
Accept: text/html;q=0.6, text/markdown;q=0.9
```

会选择 `text/markdown`。

同权重时优先级：

1. `event-stream`
2. `markdown`
3. `html`

## 兼容性

不写 `q` 仍然兼容旧行为。
