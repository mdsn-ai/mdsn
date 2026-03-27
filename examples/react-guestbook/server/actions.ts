import {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
  type ActionContext,
} from "@mdsnai/sdk/server";

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" as const },
    { name: "message", type: "text" as const, required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

type GuestbookEntry = {
  id: string;
  nickname: string;
  message: string;
  createdAt: string;
};

const messages: GuestbookEntry[] = [];

function listGuestbookMessages(): GuestbookEntry[] {
  return messages.map((entry) => ({ ...entry }));
}

function addGuestbookMessage(message: {
  nickname: string;
  message: string;
}): GuestbookEntry {
  const entry: GuestbookEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: message.nickname,
    message: message.message,
    createdAt: new Date().toISOString(),
  };

  messages.unshift(entry);
  if (messages.length > 20) {
    messages.length = 20;
  }

  return { ...entry };
}

function renderGuestbookFragment(): string {
  const renderedMessages = listGuestbookMessages();

  return renderMarkdownFragment({
    body: [
      "## Latest Messages",
      renderedMessages.length > 0
        ? renderMarkdownValue(
          "list",
          renderedMessages.map((entry) => `**${entry.nickname}**: ${entry.message}`),
        )
        : "_No messages yet._",
    ],
    block: guestbookBlock,
  });
}

export function resetGuestbookMessagesForTest(): void {
  messages.length = 0;
}

export const actions = defineActions({
  list: defineAction({
    async run(): Promise<string> {
      return renderGuestbookFragment();
    },
  }),
  post: defineAction({
    async run(ctx: Pick<ActionContext, "inputs">): Promise<
      string | { ok: false; errorCode: string; fieldErrors: Record<string, string> }
    > {
      const nickname = String(ctx.inputs.nickname ?? "").trim().slice(0, 24) || "Guest";
      const message = String(ctx.inputs.message ?? "").trim().slice(0, 280);

      if (!message) {
        return {
          ok: false,
          errorCode: "EMPTY_MESSAGE",
          fieldErrors: {
            message: "Please enter a message.",
          },
        };
      }

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment();
    },
  }),
});
