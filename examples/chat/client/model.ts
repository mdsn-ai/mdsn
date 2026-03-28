import type {
  MarkdownBlockNode,
  MarkdownInlineNode,
  ParsedFragment,
} from "@mdsnai/sdk/web";

export type ChatMessage = {
  time: string;
  agent: string;
  message: string;
};

export type AuthMode = "login" | "register";

export type AuthDraft = {
  username: string;
  email: string;
  password: string;
};

type ScrollableLike = {
  scrollTop: number;
  scrollHeight: number;
};

function inlineText(nodes: MarkdownInlineNode[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "strong":
      case "em":
      case "link":
        return inlineText(node.children);
      case "inline_code":
        return node.value;
      case "image":
        return node.alt;
      case "softbreak":
      case "hardbreak":
        return " ";
      case "html_inline":
        return node.value;
    }
  }).join("");
}

function parseChatLine(nodes: MarkdownInlineNode[]): ChatMessage | null {
  const timeNode = nodes.find((node) => node.type === "inline_code");
  const agentNode = nodes.find((node) => node.type === "strong");
  if (!timeNode || !agentNode) {
    return null;
  }

  const time = timeNode.value.trim();
  const agent = inlineText(agentNode.children).trim();
  const raw = inlineText(nodes).trim();
  const marker = `${time} ${agent} ·`;
  const message = raw.startsWith(marker)
    ? raw.slice(marker.length).trim()
    : raw.split("·").slice(1).join("·").trim();

  if (!time || !agent || !message) {
    return null;
  }

  return {
    time,
    agent,
    message,
  };
}

function visitBlocks(nodes: MarkdownBlockNode[], messages: ChatMessage[]): void {
  for (const node of nodes) {
    if (node.type === "list") {
      for (const item of node.items) {
        const paragraph = item.find((child) => child.type === "paragraph");
        if (paragraph?.type === "paragraph") {
          const parsed = parseChatLine(paragraph.children);
          if (parsed) {
            messages.push(parsed);
          }
        }
        visitBlocks(item, messages);
      }
      continue;
    }

    if (node.type === "blockquote") {
      visitBlocks(node.children, messages);
    }
  }
}

export function extractChatMessages(fragment: ParsedFragment): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const container of fragment.containers) {
    visitBlocks(container.nodes, messages);
  }
  return messages;
}

export function scrollChatStreamToBottom(stream: ScrollableLike | null | undefined): void {
  if (!stream) {
    return;
  }

  stream.scrollTop = stream.scrollHeight;
}

export function resolveAuthDraftAfterFailure(mode: AuthMode, draft: AuthDraft): AuthDraft {
  if (mode === "login") {
    return {
      username: draft.username,
      email: draft.email,
      password: "",
    };
  }

  return draft;
}
