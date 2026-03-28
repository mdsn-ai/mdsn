import {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
  type ActionContext,
} from "@mdsnai/sdk/server";
import type { ChatStorage } from "./storage";

const DEFAULT_CHAT_WINDOW_LIMIT = 50;
const MAX_CHAT_WINDOW_LIMIT = 200;

function clampChatWindowLimit(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_CHAT_WINDOW_LIMIT;
  }
  const rounded = Math.floor(numeric);
  if (rounded < DEFAULT_CHAT_WINDOW_LIMIT) {
    return DEFAULT_CHAT_WINDOW_LIMIT;
  }
  if (rounded > MAX_CHAT_WINDOW_LIMIT) {
    return MAX_CHAT_WINDOW_LIMIT;
  }
  return rounded;
}

function createChatBlock(includeMore: boolean) {
  return {
    name: "chat",
    inputs: [
      { name: "message", type: "text" as const, required: true },
    ],
    reads: [
      { name: "messages", target: "/list" },
      ...(includeMore ? [{ name: "more", target: "/load-more" }] : []),
    ],
    writes: [{ name: "send", target: "/send", inputs: ["message"] }],
  };
}

export const chatBlock = createChatBlock(true);

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
  const limit = clampChatWindowLimit(options.limit);
  const renderedMessages = storage.listRecentMessages(limit);
  const includeMore = storage.countMessages() > limit;

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
    block: createChatBlock(includeMore),
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

export function renderChatFailureFragment(
  storage: ChatStorage,
  message: string,
  nextStep: string,
  limit: number = DEFAULT_CHAT_WINDOW_LIMIT,
): string {
  const boundedLimit = clampChatWindowLimit(limit);
  const includeMore = storage.countMessages() > boundedLimit;
  return renderMarkdownFragment({
    body: [
      "## Chat Status",
      message,
      nextStep,
      "## Conversation",
      `This view shows up to the most recent ${boundedLimit} messages.\n\nUse \`more\` to read older messages.`,
      ...(() => {
        const renderedMessages = storage.listRecentMessages(boundedLimit);
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
    block: createChatBlock(includeMore),
  });
}

export function renderRedirectFragment(
  location: string,
  heading: string,
  message: string,
): string {
  const nextName = location === "/chat" ? "enter_chat" : location === "/" ? "go_login" : "continue_next";
  return renderMarkdownFragment({
    body: [
      heading,
      message,
      `Next step: use \`${nextName}\` to continue.`,
    ],
    block: {
      name: "next",
      inputs: [],
      reads: [{ name: nextName, target: location }],
      writes: [],
    },
  });
}

export function createChatActions(storage: ChatStorage) {
  return defineActions({
    register: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<string> {
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

        return renderRedirectFragment(
          "/chat",
          "## Registration Status",
          "Registration succeeded. You are now signed in.",
        );
      },
    }),
    login: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<string> {
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

        return renderRedirectFragment(
          "/chat",
          "## Login Status",
          "Login succeeded. Welcome back to the shared chat.",
        );
      },
    }),
    logout: defineAction({
      async run(): Promise<string> {
        return renderRedirectFragment(
          "/",
          "## Logout Status",
          "Logout succeeded. The current session has been cleared.",
        );
      },
    }),
    list: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<string> {
        const limit = clampChatWindowLimit(ctx.inputs.windowLimit);
        return renderChatFragment(storage, {
          limit,
          contextMessage: `This view shows up to the most recent ${limit} messages.\n\nUse \`more\` to read older messages.`,
        });
      },
    }),
    history: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<string> {
        const limit = clampChatWindowLimit(ctx.inputs.windowLimit);
        return renderChatFragment(storage, {
          limit,
          contextMessage: "This view includes older messages for deeper context.",
        });
      },
    }),
    send: defineAction({
      async run(ctx: Pick<ActionContext, "inputs">): Promise<string> {
        const userId = String(ctx.inputs.userId ?? "").trim();
        const message = String(ctx.inputs.message ?? "").trim().slice(0, 280);
        const limit = clampChatWindowLimit(ctx.inputs.windowLimit);

        if (!userId) {
          return renderChatFailureFragment(
            storage,
            "Send failed: sign in before sending messages.",
            "Next step: log in and try again.",
            limit,
          );
        }

        if (!message) {
          return renderChatFailureFragment(
            storage,
            "Send failed: a message is required before this chat action can continue.",
            "Next step: enter a message and submit again.",
            limit,
          );
        }

        storage.appendMessage({
          userId,
          content: message,
        });
        return renderChatFragment(storage, {
          limit,
          contextMessage: `This view shows up to the most recent ${limit} messages.\n\nUse \`more\` to read older messages.`,
        });
      },
    }),
  });
}
