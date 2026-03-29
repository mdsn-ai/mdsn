import { describe, expect, it } from "vitest";
import { createPageRenderModel } from "../sdk/src/web/page-render";

describe("new web page render", () => {
  it("renders block anchors into named block regions", () => {
    const model = createPageRenderModel({
      frontmatter: {
        title: "Chat",
      },
      markdown: "# Chat\n\n<!-- mdsn:block chat -->",
      blockAnchors: [{ name: "chat" }],
      blocks: [
        {
          name: "chat",
          inputs: [
            {
              id: "chat::input::message",
              block: "chat",
              name: "message",
              type: "text",
              required: true,
              secret: false,
            },
          ],
          reads: [],
          writes: [
            {
              id: "chat::write::0",
              block: "chat",
              name: "send",
              target: "/messages",
              inputs: ["message"],
              order: 0,
            },
          ],
        },
      ],
    });

    expect(model.markdownHtml).toContain('data-mdsn-block-region="chat"');
    expect(model.markdownHtml).toContain('data-mdsn-write="chat::write::0"');
    expect(model.markdownHtml).toContain('data-input-name="message"');
    expect(model.bootstrap.version).toBe("vNext");
    expect(model.page.segments.map((segment) => segment.type)).toEqual(["container", "anchor"]);
    expect(model.page.anchors).toEqual([{ name: "chat" }]);
  });

  it("maps read and write targets through the host route mapper", () => {
    const model = createPageRenderModel(
      {
        frontmatter: {
          title: "Chat",
        },
        markdown: "# Chat\n\n<!-- mdsn:block chat -->",
        blockAnchors: [{ name: "chat" }],
        blocks: [
          {
            name: "chat",
            inputs: [],
            reads: [
              {
                id: "chat::read::0",
                block: "chat",
                name: "refresh",
                target: "/messages",
                inputs: [],
                order: 0,
              },
            ],
            writes: [
              {
                id: "chat::write::1",
                block: "chat",
                name: "send",
                target: "/messages",
                inputs: [],
                order: 1,
              },
            ],
          },
        ],
      },
      {
        mapActionTarget: (target) => `/__mdsn/actions${target}`,
      },
    );

    expect(model.markdownHtml).toContain('data-target="/__mdsn/actions/messages"');
    expect(model.markdownHtml).not.toContain('data-target="/messages"');
  });

  it("does not render a standard read button for stream declarations", () => {
    const model = createPageRenderModel({
      frontmatter: {
        title: "Chat",
      },
      markdown: "# Chat\n\n<!-- mdsn:block session -->",
      blockAnchors: [{ name: "session" }],
      blocks: [
        {
          name: "session",
          inputs: [],
          reads: [
            {
              id: "session::read::0",
              block: "session",
              name: undefined,
              target: "/stream",
              accept: "text/event-stream",
              inputs: [],
              order: 0,
            },
          ],
          writes: [],
        },
      ],
    });

    expect(model.markdownHtml).toContain('data-mdsn-block-region="session"');
    expect(model.markdownHtml).not.toContain('data-mdsn-read="session::read::0"');
    expect(model.markdownHtml).not.toContain("/stream");
  });
});
