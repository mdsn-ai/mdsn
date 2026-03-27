import { describe, expect, it } from "vitest";
import { createPageRenderModel } from "../sdk/src/web/page-render";

describe("new web page render", () => {
  it("renders block anchors into named block regions", () => {
    const model = createPageRenderModel({
      frontmatter: {
        title: "Chat",
      },
      markdown: "# Chat\n\n<!-- mdsn:block chat -->",
      schemas: [],
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
          redirects: [
            {
              id: "chat::redirect::1",
              block: "chat",
              target: "/login",
              order: 1,
            },
          ],
        },
      ],
    });

    expect(model.markdownHtml).toContain('data-mdsn-block-region="chat"');
    expect(model.markdownHtml).toContain('data-mdsn-write="chat::write::0"');
    expect(model.markdownHtml).toContain('data-mdsn-redirect="chat::redirect::1"');
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
        schemas: [],
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
            redirects: [],
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
});
