import { describe, expect, it } from "vitest";
import { parsePageDefinition } from "../sdk/src/core/document/page-definition";

describe("new core document parser", () => {
  it("parses a page into static markdown plus named blocks", () => {
    const raw = `---
title: Guestbook
---

# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
schema filters_schema {
  "type": "object"
}

block guestbook {
  input nickname: text
  input message!: text
  write submit: "/messages" (nickname, message)
  read refresh: "/messages"
}
\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.frontmatter).toMatchObject({
      title: "Guestbook",
    });
    expect(document.blockAnchors).toEqual([{ name: "guestbook" }]);
    expect(document.schemas).toEqual([
      {
        name: "filters_schema",
        shape: {
          type: "object",
        },
      },
    ]);
    expect(document.blocks).toEqual([
      {
        name: "guestbook",
        inputs: [
          {
            id: "guestbook::input::nickname",
            block: "guestbook",
            name: "nickname",
            type: "text",
            required: false,
            secret: false,
          },
          {
            id: "guestbook::input::message",
            block: "guestbook",
            name: "message",
            type: "text",
            required: true,
            secret: false,
          },
        ],
        reads: [
          {
            id: "guestbook::read::1",
            block: "guestbook",
            name: "refresh",
            target: "/messages",
            inputs: [],
            order: 1,
          },
        ],
        writes: [
          {
            id: "guestbook::write::0",
            block: "guestbook",
            name: "submit",
            target: "/messages",
            inputs: ["nickname", "message"],
            order: 0,
          },
        ],
        redirects: [],
      },
    ]);
    expect(document.markdown).toContain("<!-- mdsn:block guestbook -->");
    expect(document.markdown).not.toContain("```mdsn");
  });

  it("parses plain markdown pages without executable mdsn blocks", () => {
    const raw = `# Docs

\`\`\`\`mdsn-src
\`\`\`mdsn
block guestbook {
  input nickname: text
}
\`\`\`
\`\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.blocks).toEqual([]);
    expect(document.blockAnchors).toEqual([]);
    expect(document.markdown).toContain("```mdsn-src");
  });

  it("rejects pages with multiple executable mdsn code blocks", () => {
    const raw = `# Invalid

\`\`\`mdsn
block first {
}
\`\`\`

\`\`\`mdsn
block second {
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      "An MDSN page must contain at most one mdsn code block",
    );
  });
});
