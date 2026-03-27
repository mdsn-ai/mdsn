import { describe, expect, it } from "vitest";
import { parseBlockFragment, renderBlockFragmentHtml } from "../sdk/src/web/fragment-render";

describe("new web fragment render", () => {
  it("parses plain markdown fragments without executable mdsn", () => {
    const fragment = parseBlockFragment("## Updated\n\nSaved.");

    expect(fragment.markdown).toBe("## Updated\n\nSaved.");
    expect(fragment.schemas).toEqual([]);
    expect(fragment.blocks).toEqual([]);
  });

  it("parses markdown fragments that contain one executable mdsn block", () => {
    const fragment = parseBlockFragment(`# Chat

\`\`\`mdsn
block chat {
  input message!: text
  write send: "/messages" (message)
}
\`\`\`
`);

    expect(fragment.markdown).toContain("# Chat");
    expect(fragment.markdown).not.toContain("```mdsn");
    expect(fragment.blocks).toEqual([
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
        redirects: [],
      },
    ]);
  });

  it("rejects fragments that contain more than one executable mdsn block", () => {
    expect(() =>
      parseBlockFragment(`\`\`\`mdsn
block one {
}
\`\`\`

\`\`\`mdsn
block two {
}
\`\`\`
`),
    ).toThrow("A block fragment may contain at most one mdsn code block");
  });

  it("renders interactive fragment html with both markdown content and block controls", () => {
    const html = renderBlockFragmentHtml(`## Messages

- **Tom**: Hello

\`\`\`mdsn
block guestbook {
  input message!: text
  write submit: "/guestbook/post" (message)
}
\`\`\`
`, "guestbook", {
      mapActionTarget: (target) => `/__mdsn/actions${target}`,
    });

    expect(html).toContain("<h2>Messages</h2>");
    expect(html).toContain("<li><strong>Tom</strong>: Hello</li>");
    expect(html).toContain('data-mdsn-block-panel="guestbook"');
    expect(html).toContain('data-target="/__mdsn/actions/guestbook/post"');
    expect(html).not.toContain('data-mdsn-block-region="guestbook"');
  });

  it("preserves markdown before and after an interactive block", () => {
    const html = renderBlockFragmentHtml(`Before block.

\`\`\`mdsn
block guestbook {
  input message!: text
  write submit: "/guestbook/post" (message)
}
\`\`\`

After block.
`, "guestbook");

    const beforeIndex = html.indexOf("<p>Before block.</p>");
    const blockIndex = html.indexOf('data-mdsn-block-panel="guestbook"');
    const afterIndex = html.indexOf("<p>After block.</p>");

    expect(beforeIndex).toBeGreaterThanOrEqual(0);
    expect(blockIndex).toBeGreaterThan(beforeIndex);
    expect(afterIndex).toBeGreaterThan(blockIndex);
  });
});
