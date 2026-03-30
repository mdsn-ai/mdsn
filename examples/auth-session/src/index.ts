import { randomUUID } from "node:crypto";

import { composePage } from "@mdsnai/sdk/core";
import {
  block,
  createHostedApp,
  fail,
  navigate,
  signIn,
  signOut,
  type MdsnRequest,
  type MdsnResponse,
  type MdsnSessionProvider,
  type MdsnSessionSnapshot
} from "@mdsnai/sdk/server";

interface UserRecord {
  password: string;
  notes: string[];
}

export interface CreateAuthServerOptions {
  loginSource: string;
  registerSource: string;
  vaultSource: string;
}

type AuthSession = { sessionId: string; userId: string };

function createMemorySessionProvider(users: Map<string, UserRecord>): MdsnSessionProvider {
  const sessions = new Map<string, AuthSession>();

  return {
    async read(request) {
      const rawSessionId = request.cookies.mdsn_session;
      const sessionId = rawSessionId ? decodeURIComponent(rawSessionId) : undefined;
      if (!sessionId) {
        return null;
      }

      const session = sessions.get(sessionId);
      if (!session || !users.has(session.userId)) {
        if (sessionId) {
          sessions.delete(sessionId);
        }
        return null;
      }
      return session;
    },
    async commit(mutation, response: MdsnResponse) {
      if (mutation?.type === "sign-in" || mutation?.type === "refresh") {
        const next = mutation.session as Partial<AuthSession> & { userId: string };
        const session: AuthSession = {
          sessionId: typeof next.sessionId === "string" && next.sessionId.trim() ? next.sessionId : randomUUID(),
          userId: next.userId
        };
        sessions.set(session.sessionId, session);
        response.headers["set-cookie"] = `mdsn_session=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly`;
      }
    },
    async clear(session, response) {
      const sessionId = session && typeof session.sessionId === "string" ? session.sessionId : null;
      if (sessionId) {
        sessions.delete(sessionId);
      }
      response.headers["set-cookie"] = "mdsn_session=; Path=/; Max-Age=0";
    }
  };
}

function getSessionUserId(session: MdsnSessionSnapshot | null): string | null {
  const userId = session && typeof session.userId === "string" ? session.userId : null;
  return userId && userId.trim() ? userId : null;
}

function createRecoverableVaultFragment(markdown: string) {
  return fail({
    status: 401,
    fragment: {
      markdown,
      blocks: [
        {
          name: "vault",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/login",
              name: "recover",
              inputs: [],
              label: "Open Sign In"
            }
          ]
        }
      ]
    }
  });
}

export function createAuthServer(options: CreateAuthServerOptions) {
  const users = new Map<string, UserRecord>();
  const sessionProvider = createMemorySessionProvider(users);

  function renderLoginBlock(userId: string | null, banner?: string): string {
    if (!userId) {
      return [banner ?? "## Welcome back", "Sign in to open your private vault."]
        .filter(Boolean)
        .join("\n\n");
    }

    return [banner ?? `## Already signed in as ${userId}`, "Open your private vault or sign out to switch accounts."]
      .filter(Boolean)
      .join("\n\n");
  }

  function renderRegisterBlock(userId: string | null, banner?: string): string {
    if (!userId) {
      return [banner ?? "## Create your account", "Choose one identity so your private notes stay with your session."]
        .filter(Boolean)
        .join("\n\n");
    }

    return [banner ?? `## Already signed in as ${userId}`, "Your vault is ready. Open it or sign out to register a different account."]
      .filter(Boolean)
      .join("\n\n");
  }

  function renderSessionBlock(userId: string, banner?: string): string {
    return [banner ?? `## Welcome ${userId}`, "Your session is active. Save notes or sign out when you're done."]
      .filter(Boolean)
      .join("\n\n");
  }

  function renderVaultBlock(userId: string | null, banner?: string): string {
    if (!userId) {
      return [banner ?? "## Private notes are locked", "Sign in first, then save a private note tied to your session."]
        .filter(Boolean)
        .join("\n\n");
    }

    const notes = users.get(userId)?.notes ?? [];
    const count = `${notes.length} saved ${notes.length === 1 ? "note" : "notes"}`;
    const list = notes.length > 0 ? notes.map((note) => `- ${note}`).join("\n") : "- No private notes yet";
    return [banner ?? `## ${count}`, list].filter(Boolean).join("\n\n");
  }

  function renderLoginPage(userId: string | null, banner?: { login?: string }) {
    return composePage(options.loginSource, {
      blocks: {
        login: renderLoginBlock(userId, banner?.login)
      },
      visibleBlocks: ["login"]
    });
  }

  function renderRegisterPage(userId: string | null, banner?: { register?: string }) {
    return composePage(options.registerSource, {
      blocks: {
        register: renderRegisterBlock(userId, banner?.register)
      },
      visibleBlocks: ["register"]
    });
  }

  function renderVaultPage(userId: string | null, banner?: { session?: string; vault?: string }) {
    return composePage(options.vaultSource, {
      blocks: {
        session: userId ? renderSessionBlock(userId, banner?.session) : "",
        vault: renderVaultBlock(userId, banner?.vault)
      },
      visibleBlocks: userId ? ["session", "vault"] : []
    });
  }

  const server = createHostedApp({
    session: sessionProvider,
    pages: {
      "/login": ({ session }) => {
        const userId = getSessionUserId(session);
        return userId ? renderVaultPage(userId) : renderLoginPage(null);
      },
      "/register": ({ session }) => {
        const userId = getSessionUserId(session);
        return userId ? renderVaultPage(userId) : renderRegisterPage(null);
      },
      "/vault": ({ session }) => renderVaultPage(getSessionUserId(session))
    },
    actions: [
      {
        target: "/register",
        methods: ["POST"],
        routePath: "/register",
        blockName: "register",
        handler: ({ inputs }) => {
        const nickname = String(inputs.nickname ?? "").trim();
        const password = String(inputs.password ?? "");
        if (!nickname || !password) {
          return block(renderRegisterPage(null, { register: "## Nickname and password are required" }), "register", {
            status: 400
          });
        }
        if (users.has(nickname)) {
          return block(
            renderRegisterPage(null, {
              register: `## ${nickname} already exists`
            }),
            "register",
            {
              status: 409
            }
          );
        }

        users.set(nickname, { password, notes: [] });
        return navigate({
          blockName: "register",
          target: "/vault",
          name: "open_vault",
          label: "Open Vault",
          markdown: `## Account created for ${nickname}\n\nUse \`open_vault\` to continue.`,
          session: signIn({ userId: nickname })
        });
        }
      },
      {
        target: "/login",
        methods: ["POST"],
        routePath: "/login",
        blockName: "login",
        handler: ({ inputs }) => {
        const nickname = String(inputs.nickname ?? "").trim();
        const password = String(inputs.password ?? "");
        const user = users.get(nickname);

        if (!user || user.password !== password) {
          return block(renderLoginPage(null, { login: "## Invalid credentials" }), "login", {
            status: 401
          });
        }

        return navigate({
          blockName: "login",
          target: "/vault",
          name: "open_vault",
          label: "Open Vault",
          markdown: `## Welcome ${nickname}\n\nUse \`open_vault\` to continue.`,
          session: signIn({ userId: nickname })
        });
        }
      },
      {
        target: "/vault/logout",
        methods: ["POST"],
        routePath: "/vault",
        blockName: "session",
        handler: ({ session }) => {
        return navigate({
          blockName: "session",
          target: "/login",
          name: "open_login",
          label: "Open Sign In",
          markdown: "## Signed out\n\nUse `open_login` to continue.",
          session: signOut()
        });
        }
      },
      {
        target: "/vault",
        methods: ["POST"],
        routePath: "/vault",
        blockName: "vault",
        handler: ({ session, inputs, request }) => {
        const userId = getSessionUserId(session);
        if (!userId) {
          return createRecoverableVaultFragment(
            "## Please sign in before saving notes\n\nOpen the sign in page, then come back to your private notes."
          );
        }

        if (request.method === "POST") {
          const message = String(inputs.message ?? "").trim();
          if (!message) {
            return block(renderVaultPage(userId, { vault: "## Message is required" }), "vault", {
              status: 400
            });
          }
          users.get(userId)?.notes.push(message);
        }

        return block(renderVaultPage(userId), "vault");
      }
      }
    ]
  });

  return server;
}

export async function requestAccount(server: ReturnType<typeof createAuthServer>, request: MdsnRequest) {
  return server.handle(request);
}
