import {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
  type ActionContext,
} from "@mdsnai/sdk/server";
import type { ChatStorage } from "./storage";

type ActionFailure = {
  ok: false;
  errorCode: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const chatBlock = {
  name: "chat",
  inputs: [
    { name: "message", type: "text" as const, required: true },
  ],
  reads: [
    { name: "refresh", target: "/list" },
    { name: "load_more", target: "/load-more" },
  ],
  writes: [{ name: "send", target: "/send", inputs: ["message"] }],
};

export const loginAuthBlock = {
  name: "auth",
  inputs: [
    { name: "email", type: "text" as const, required: true },
    { name: "password", type: "text" as const, required: true, secret: true },
  ],
  writes: [{ name: "login", target: "/login", inputs: ["email", "password"] }],
};

export const registerAuthBlock = {
  name: "auth",
  inputs: [
    { name: "username", type: "text" as const, required: true },
    { name: "email", type: "text" as const, required: true },
    { name: "password", type: "text" as const, required: true, secret: true },
  ],
  writes: [{ name: "register", target: "/register", inputs: ["username", "email", "password"] }],
};

export const sessionBlock = {
  name: "session",
  inputs: [],
  reads: [],
  writes: [{ name: "logout", target: "/logout", inputs: [] }],
  redirects: [],
};

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function escapeInlineMarkdown(value: string): string {
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/([`*_{}\[\]()#+\-!|>])/gu, "\\$1");
}

function renderSafeUsername(value: string): string {
  return escapeInlineMarkdown(value.replace(/\r?\n/gu, " ").trim());
}

function renderSafeMessage(value: string): string {
  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join(" \\n ")
    .trim();
  return escapeInlineMarkdown(normalized);
}

function renderChatFragment(
  storage: ChatStorage,
  options: {
    limit: number;
    contextMessage: string;
  },
): string {
  const renderedMessages = storage.listRecentMessages(options.limit);

  return renderMarkdownFragment({
    body: [
      "## Conversation",
      options.contextMessage,
      renderedMessages.length > 0
        ? renderMarkdownValue(
          "list",
          renderedMessages.map((entry) =>
            `\`${formatMessageTime(entry.createdAt)}\` **${renderSafeUsername(entry.username)}** · ${renderSafeMessage(entry.content)}`),
        )
        : "_No messages yet._",
      "### Continue",
      "Use the same room to continue the shared conversation.",
    ],
    block: chatBlock,
  });
}

export function renderLoginFailureFragment(message: string): string {
  return renderMarkdownFragment({
    body: [
      "## Login Status",
      message,
      "Next step: enter the correct password and submit again, or go to register if no account exists.",
    ],
    block: loginAuthBlock,
  });
}

export function renderRegisterFailureFragment(message: string): string {
  return renderMarkdownFragment({
    body: [
      "## Registration Status",
      message,
      "Next step: choose a different identity, or go back to login if this account already exists.",
    ],
    block: registerAuthBlock,
  });
}

export function renderChatFailureFragment(storage: ChatStorage, message: string, nextStep: string): string {
  return renderMarkdownFragment({
    body: [
      "## Chat Status",
      message,
      nextStep,
      "## Conversation",
      "This view shows the most recent 50 messages.\n\nUse `load_more` to read older messages.",
      ...(() => {
        const renderedMessages = storage.listRecentMessages(50);
        return renderedMessages.length > 0
          ? [renderMarkdownValue(
            "list",
            renderedMessages.map((entry) =>
              `\`${formatMessageTime(entry.createdAt)}\` **${renderSafeUsername(entry.username)}** · ${renderSafeMessage(entry.content)}`),
          )]
          : ["_No messages yet._"];
      })(),
      "### Continue",
      "Use the same room to continue the shared conversation.",
    ],
    block: chatBlock,
  });
}

export function renderRedirectFragment(
  location: string,
  heading: string,
  message: string,
): string {
  return renderMarkdownFragment({
    body: [
      heading,
      message,
      `Next step: follow redirect to \`${location}\`.`,
    ],
    block: {
      name: "next",
      inputs: [],
      reads: [],
      writes: [],
      redirects: [{ target: location }],
    },
  });
}

export function createChatActions(storage: ChatStorage) {
  return defineActions({
    register: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<
        { ok: true; kind: "redirect"; location: string } | string | ActionFailure
      > {
        const username = String(ctx.inputs.username ?? "").trim().slice(0, 32);
        const email = String(ctx.inputs.email ?? "").trim().slice(0, 120).toLowerCase();
        const password = String(ctx.inputs.password ?? "").trim().slice(0, 120);

        if (!username) {
          return renderRegisterFailureFragment(
            "Registration failed: a username is required before an account can be created.",
          );
        }

        if (!email) {
          return renderRegisterFailureFragment(
            "Registration failed: an email is required before an account can be created.",
          );
        }

        if (!password) {
          return renderRegisterFailureFragment(
            "Registration failed: a password is required before an account can be created.",
          );
        }

        try {
          storage.createUser({ username, email, password });
        } catch (error) {
          if (error instanceof Error && error.message === "IDENTITY_CONFLICT") {
            return renderRegisterFailureFragment(
              "Registration failed: this username or email is already registered.",
            );
          }
          throw error;
        }

        return {
          ok: true,
          kind: "redirect",
          location: "/chat",
        };
      },
    }),
    login: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<
        { ok: true; kind: "redirect"; location: string } | string | ActionFailure
      > {
        const email = String(ctx.inputs.email ?? "").trim().slice(0, 120).toLowerCase();
        const password = String(ctx.inputs.password ?? "").trim().slice(0, 120);

        if (!email) {
          return renderLoginFailureFragment(
            "Login failed: an email is required before the account can be verified.",
          );
        }

        if (!password) {
          return renderLoginFailureFragment(
            "Login failed: a password is required before the account can be verified.",
          );
        }

        const user = storage.authenticateUser({ email, password });
        if (!user) {
          return renderLoginFailureFragment(
            "Login failed: no account matches this email and password.",
          );
        }

        return {
          ok: true,
          kind: "redirect",
          location: "/chat",
        };
      },
    }),
    logout: defineAction({
      async run(): Promise<{ ok: true; kind: "redirect"; location: string }> {
        return {
          ok: true,
          kind: "redirect",
          location: "/",
        };
      },
    }),
    list: defineAction({
      async run(): Promise<string> {
        return renderChatFragment(storage, {
          limit: 50,
          contextMessage: "This view shows the most recent 50 messages.\n\nUse `load_more` to read older messages.",
        });
      },
    }),
    history: defineAction({
      async run(): Promise<string> {
        return renderChatFragment(storage, {
          limit: 200,
          contextMessage: "This view includes older messages for deeper context.",
        });
      },
    }),
    send: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<
        string | { ok: false; errorCode: string; message?: string; fieldErrors: Record<string, string> }
      > {
        const userId = String(ctx.inputs.userId ?? "").trim();
        const message = String(ctx.inputs.message ?? "").trim().slice(0, 280);

        if (!userId) {
          return {
            ok: false,
            errorCode: "NOT_LOGGED_IN",
            fieldErrors: {},
          };
        }

        if (!message) {
          return {
            ok: false,
            errorCode: "EMPTY_MESSAGE",
            message: "Send failed: a message is required before this chat action can continue.",
            fieldErrors: {
              message: "Next step: enter a message and submit again.",
            },
          };
        }

        storage.appendMessage({
          userId,
          content: message,
        });
        return renderChatFragment(storage, {
          limit: 50,
          contextMessage: "This view shows the most recent 50 messages.\n\nUse `load_more` to read older messages.",
        });
      },
    }),
  });
}
