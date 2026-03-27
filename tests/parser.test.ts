import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePageDefinition } from "../sdk/src/core";
import { renderPageHtml } from "../sdk/src/web";

function readGuestbookMarkdown() {
  return readFileSync(
    path.join(process.cwd(), "examples", "guestbook", "pages", "index.md"),
    "utf8",
  );
}

describe("public parsePageDefinition", () => {
  it("parses guestbook.md into a static page plus one interactive block", () => {
    const document = parsePageDefinition(readGuestbookMarkdown());

    expect(document.frontmatter).toMatchObject({
      id: "guestbook",
      title: "Guestbook",
    });
    expect(document.schemas).toEqual([]);
    expect(document.blockAnchors).toEqual([{ name: "guestbook" }]);
    expect(document.markdown).toContain("<!-- mdsn:block guestbook -->");
    expect(document.markdown).not.toContain("```mdsn");
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
            id: "guestbook::read::0",
            block: "guestbook",
            name: "refresh",
            target: "/list",
            inputs: [],
            order: 0,
          },
        ],
        writes: [
          {
            id: "guestbook::write::1",
            block: "guestbook",
            name: "submit",
            target: "/post",
            inputs: ["nickname", "message"],
            order: 1,
          },
        ],
        redirects: [],
      },
    ]);
  });

  it("renders a full html document from the parsed page", () => {
    const document = parsePageDefinition(readGuestbookMarkdown());
    const html = renderPageHtml(document);

    expect(html).toContain('data-mdsn-root');
    expect(html).toContain('data-mdsn-block-region="guestbook"');
    expect(html).toContain('data-mdsn-write="guestbook::write::1"');
    expect(html).toContain('data-mdsn-read="guestbook::read::0"');
    expect(html).toContain('id="mdsn-bootstrap"');
    expect(html).toContain('"version":"vNext"');
    expect(html).toContain('<script src="/__mdsn/client.js" defer></script>');
    expect(html).not.toContain('data-mdsn-result=');
  });

  it("supports json inputs with schema references", () => {
    const raw = `---
title: Search
---

# Search

<!-- mdsn:block search -->

\`\`\`mdsn
schema filters_schema {
  "type": "object",
  "properties": {
    "query": { "type": "string" }
  },
  "required": ["query"]
}

block search {
  input filters!: json filters_schema
  read search: "/search" (filters)
}
\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.schemas).toEqual([
      {
        name: "filters_schema",
        shape: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    ]);
    expect(document.blocks[0]?.inputs[0]).toMatchObject({
      name: "filters",
      type: "json",
      required: true,
      schema: "filters_schema",
    });
    expect(document.blocks[0]?.reads[0]).toMatchObject({
      name: "search",
      target: "/search",
      inputs: ["filters"],
    });
  });

  it("parses multiple blocks and static redirects", () => {
    const raw = `---
title: Flow
---

# Flow

<!-- mdsn:block login -->
<!-- mdsn:block chat -->

\`\`\`mdsn
block login {
  input account!: text
  write submit: "/login" (account)
  redirect "/chat"
}

block chat {
  input message!: text
  write send: "/chat/send" (message)
}
\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.blocks.map((block) => block.name)).toEqual(["login", "chat"]);
    expect(document.blocks[0]?.redirects).toEqual([
      {
        id: "login::redirect::1",
        block: "login",
        target: "/chat",
        order: 1,
      },
    ]);
  });

  it("rejects pages that contain more than one mdsn code block", () => {
    const raw = `---
title: Invalid
---

\`\`\`mdsn
block first {
}
\`\`\`

\`\`\`mdsn
block second {
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow("An MDSN page must contain at most one mdsn code block");
  });

  it("requires named read and write operations", () => {
    const raw = `---
title: Invalid
---

\`\`\`mdsn
block guestbook {
  input message!: text
  write "/post" (message)
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      'Invalid write declaration: write "/post" (message)',
    );
  });

  it("rejects duplicate operation names inside the same block", () => {
    const raw = `---
title: Duplicate operation
---

\`\`\`mdsn
block search {
  input query!: text
  read search: "/search" (query)
  write search: "/save" (query)
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      "Duplicate operation name in block search: search",
    );
  });
});
