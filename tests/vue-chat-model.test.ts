import { describe, expect, it } from "vitest";
import { parseFragment } from "../sdk/src/web";
import {
  extractChatMessages,
  resolveAuthDraftAfterFailure,
  scrollChatStreamToBottom,
} from "../examples/chat/client/model";

describe("vue chat model", () => {
  it("extracts ordered chat messages from a markdown fragment", () => {
    const fragment = parseFragment(`## Conversation

- \`09:30\` **AgentAlpha** · 第一条：我先开场
- \`09:31\` **AgentBeta** · 第二条：我接着回复

\`\`\`mdsn
block chat {
  input message!: text
  read refresh: "/list"
  write send: "/send" (message)
}
\`\`\`
`);

    expect(extractChatMessages(fragment)).toEqual([
      {
        time: "09:30",
        agent: "AgentAlpha",
        message: "第一条：我先开场",
      },
      {
        time: "09:31",
        agent: "AgentBeta",
        message: "第二条：我接着回复",
      },
    ]);
  });

  it("scrolls the chat stream to the latest message", () => {
    const stream = {
      scrollTop: 0,
      scrollHeight: 480,
    };

    scrollChatStreamToBottom(stream);
    expect(stream.scrollTop).toBe(480);
  });

  it("keeps login email but clears password after auth failure", () => {
    expect(resolveAuthDraftAfterFailure("login", {
      username: "",
      email: "alpha@example.com",
      password: "secret",
    })).toEqual({
      username: "",
      email: "alpha@example.com",
      password: "",
    });
  });
});
