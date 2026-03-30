# Session Provider

Session is a runtime concern. `@mdsnai/sdk/server` models it through a thin provider interface:

```ts
type Session = Record<string, unknown>;

type MdsnSessionProvider = {
  read(request): Promise<Session | null>;
  commit(mutation, response): Promise<void>;
  clear(response): Promise<void>;
};
```

This keeps the SDK transport-aware without hard-coding a single cookie implementation into handlers.

## What Each Method Does

- `read`: load the current session from the incoming request
- `commit`: persist a login or refresh mutation onto the outgoing response
- `clear`: remove the current session from the outgoing response

## Typical Cookie-Backed Shape

```ts
const session = {
  async read(request) {
    return request.cookies.mdsn_session ? { userId: request.cookies.mdsn_session } : null;
  },
  async commit(mutation, response) {
    if (mutation?.type === "sign-in" || mutation?.type === "refresh") {
      response.headers["set-cookie"] = `mdsn_session=${mutation.session.userId}; Path=/; HttpOnly`;
    }
  },
  async clear(response) {
    response.headers["set-cookie"] = "mdsn_session=; Path=/; Max-Age=0";
  }
};
```

This is intentionally thin so you can wrap your existing auth/session system instead of replacing it.
