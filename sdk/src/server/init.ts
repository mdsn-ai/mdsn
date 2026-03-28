import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function ensureEmptyDirectory(targetDir: string): void {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    return;
  }

  if (readdirSync(targetDir).length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

export function createStarterSite(targetDir: string): void {
  ensureEmptyDirectory(targetDir);

  mkdirSync(path.join(targetDir, "pages"), { recursive: true });
  mkdirSync(path.join(targetDir, "server"), { recursive: true });

  const packageName = path.basename(targetDir).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "mdsn-site";

  writeFileSync(
    path.join(targetDir, "package.json"),
    JSON.stringify({
      name: packageName,
      private: true,
      scripts: {
        dev: "mdsn dev",
        build: "mdsn build",
        start: "mdsn start",
      },
      dependencies: {
        "@mdsnai/sdk": "^0.1.0",
      },
    }, null, 2) + "\n",
    "utf8",
  );

  writeFileSync(
    path.join(targetDir, "pages", "index.md"),
    `---
id: guestbook
title: Guestbook
description: A runnable MDSN guestbook starter
---

# Guestbook

Start with a working guestbook and reshape it into your own app.

- \`GET\` / \`POST\` both return Markdown fragments
- the Host only replaces the current \`guestbook\` block region
- page content stays static while the block keeps updating

<!-- mdsn:block guestbook -->

\`\`\`mdsn
block guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (nickname, message) -> submit
}
\`\`\`
`,
    "utf8",
  );

  writeFileSync(
    path.join(targetDir, "server", "actions.cjs"),
    `const {
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

function getGuestbookStore() {
  if (!globalThis.__mdsnStarterGuestbookMessages) {
    globalThis.__mdsnStarterGuestbookMessages = [];
  }

  return globalThis.__mdsnStarterGuestbookMessages;
}

function listGuestbookMessages() {
  return getGuestbookStore().map((entry) => ({ ...entry }));
}

function renderGuestbookFragment(messages) {
  return renderMarkdownFragment({
    body: [
      "## Messages",
      messages.length > 0
        ? renderMarkdownValue(
          "list",
          messages.map((entry) => \`**\${entry.nickname}**: \${entry.message}\`),
        )
        : "_No messages yet._",
    ],
    block: guestbookBlock,
  });
}

function addGuestbookMessage(message) {
  const store = getGuestbookStore();
  const entry = {
    id: \`\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`,
    nickname: message.nickname,
    message: message.message,
    createdAt: new Date().toISOString(),
  };

  store.unshift(entry);
  if (store.length > 20) {
    store.length = 20;
  }

  return { ...entry };
}

module.exports = defineActions({
  list: defineAction({
    async run() {
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
  post: defineAction({
    async run(ctx) {
      const nickname = String(ctx.inputs.nickname ?? "").trim() || "Guest";
      const message = String(ctx.inputs.message ?? "").trim();

      if (!message) {
        return renderMarkdownFragment({
          body: [
            "## Action Status",
            "Please enter a message before submitting.",
          ],
          block: guestbookBlock,
        });
      }

      addGuestbookMessage({ nickname, message });
      return renderGuestbookFragment(listGuestbookMessages());
    },
  }),
});
`,
    "utf8",
  );

  writeFileSync(
    path.join(targetDir, "README.md"),
    `# ${packageName}

Starter: runnable guestbook

## Commands

\`\`\`bash
npm run dev
npm run build
npm run start
\`\`\`

Open:

\`\`\`text
http://localhost:3000/
\`\`\`

Key files:

- \`pages/index.md\`
- \`server/actions.cjs\`

Optional next steps:

- Add \`mdsn.config.cjs\` when you need custom settings
- Add \`layouts/default.html\` when you want a custom layout
`,
    "utf8",
  );
}
