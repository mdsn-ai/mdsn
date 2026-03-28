const {
  defineAction,
  defineActions,
  renderMarkdownFragment,
  renderMarkdownValue,
} = require("@mdsnai/sdk/server");

const guestbookBlock = {
  name: "guestbook",
  inputs: [
    { name: "nickname", type: "text" },
    { name: "message", type: "text", required: true },
  ],
  reads: [{ name: "refresh", target: "/list" }],
  writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
};

const messages = [];

function listGuestbookMessages() {
  return messages.map((entry) => ({ ...entry }));
}

function addGuestbookMessage(message) {
  const entry = {
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

function renderGuestbookFragment() {
  const renderedMessages = listGuestbookMessages();

  return renderMarkdownFragment({
    body: [
      "## Messages",
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

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderGuestbookFragment();
    },
  }),
  post: defineAction({
    async run(ctx) {
      const nickname = String(ctx.inputs.nickname ?? "").trim().slice(0, 24) || "Guest";
      const message = String(ctx.inputs.message ?? "").trim().slice(0, 280);

      if (!message) {
        return renderMarkdownFragment({
          body: [
            "## Guestbook Status",
            "Please enter a message before submitting.",
          ],
          block: guestbookBlock,
        });
      }

      addGuestbookMessage({
        nickname,
        message,
      });

      return renderGuestbookFragment();
    },
  }),
});
