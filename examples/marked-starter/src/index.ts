import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp } from "@mdsnai/sdk/server";
import { marked } from "marked";

export interface CreateMarkedStarterServerOptions {
  source: string;
  initialMessages?: string[];
}

export const markedMarkdownRenderer = {
  render(markdown: string): string {
    return marked.parse(markdown) as string;
  }
};

export function createMarkedStarterServer(options: CreateMarkedStarterServerOptions) {
  const messages = [...(options.initialMessages ?? ["**Welcome** to MDSN"])];

  function renderGuestbookBlock(): string {
    const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
    return `## ${count}\n\n${messages.map((message) => `- ${message}`).join("\n")}`;
  }

  function renderGuestbookPage() {
    return composePage(options.source, {
      blocks: {
        guestbook: renderGuestbookBlock()
      }
    });
  }

  return createHostedApp({
    markdownRenderer: markedMarkdownRenderer,
    pages: {
      "/guestbook": renderGuestbookPage
    },
    actions: [
      {
        target: "/list",
        methods: ["GET"],
        routePath: "/guestbook",
        blockName: "guestbook",
        handler: ({ block }) => block()
      },
      {
        target: "/post",
        methods: ["POST"],
        routePath: "/guestbook",
        blockName: "guestbook",
        handler: ({ inputs, block }) => {
          if (inputs.message) {
            messages.push(inputs.message);
          }
          return block();
        }
      }
    ]
  });
}
