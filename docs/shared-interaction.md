---
title: HTTP Content Negotiation and Shared Interaction
description: Accept negotiation, markdown/html/event-stream responses, and agent/browser convergence.
---

# HTTP Content Negotiation and Shared Interaction

MDSN supports shared interaction across agents and browsers by negotiating representation per request.

## Supported Representations

- `text/event-stream` -> stream events
- `text/markdown` -> protocol markdown payload
- `text/html` -> host-rendered html payload

## `Accept` Negotiation Rules

The runtime supports standard `q` weighting in `Accept`.

Example:

```http
Accept: text/html;q=0.6, text/markdown;q=0.9
```

Result: choose `text/markdown`.

When weights are equal, tie-break order is:

1. `event-stream`
2. `markdown`
3. `html`

If no supported representation is acceptable, runtime returns `406`.

## Write Requests

For direct action writes, canonical media type is:

- `Content-Type: text/markdown`

Wrong write media type returns `415`.

## Why This Matters

- Agents can request markdown semantics directly
- Browsers can keep html rendering path
- Stream consumers can opt into SSE explicitly
