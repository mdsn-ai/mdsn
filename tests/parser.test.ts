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

  it("rejects schema declarations and json input types", () => {
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
  INPUT text required -> filters
  GET "/search" (filters) -> search
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow("Unsupported MDSN statement: schema filters_schema {");
  });

  it("parses multiple blocks with explicit GET/POST operations", () => {
    const raw = `---
title: Flow
---

# Flow

<!-- mdsn:block login -->
<!-- mdsn:block chat -->

\`\`\`mdsn
block login {
  INPUT text required -> account
  POST "/login" (account) -> submit
  GET "/chat" -> enter_chat
}

block chat {
  INPUT text required -> message
  POST "/chat/send" (message) -> send
}
\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.blocks.map((block) => block.name)).toEqual(["login", "chat"]);
    expect(document.blocks[0]?.reads).toEqual([
      {
        id: "login::read::1",
        block: "login",
        name: "enter_chat",
        target: "/chat",
        inputs: [],
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
  INPUT text required -> message
  POST "/post" (message)
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      'Invalid write declaration: POST "/post" (message)',
    );
  });

  it("allows a stream GET without an operation name when accept is text/event-stream", () => {
    const raw = `---
title: Stream
---

# Chat

<!-- mdsn:block session -->

\`\`\`mdsn
block session {
  GET "/stream" accept:"text/event-stream"
}
\`\`\`
`;

    const document = parsePageDefinition(raw);

    expect(document.blocks[0]?.reads).toEqual([
      {
        id: "session::read::0",
        block: "session",
        name: undefined,
        target: "/stream",
        accept: "text/event-stream",
        inputs: [],
        order: 0,
      },
    ]);
  });

  it("rejects unnamed non-stream GET operations", () => {
    const raw = `---
title: Invalid
---

\`\`\`mdsn
block guestbook {
  GET "/list"
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      'Invalid read declaration: GET "/list"',
    );
  });

  it("rejects duplicate operation names inside the same block", () => {
    const raw = `---
title: Duplicate operation
---

\`\`\`mdsn
block search {
  INPUT text required -> query
  GET "/search" (query) -> search
  POST "/save" (query) -> search
}
\`\`\`
`;

    expect(() => parsePageDefinition(raw)).toThrow(
      "Duplicate operation name in block search: search",
    );
  });
});
