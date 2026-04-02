import { describe, expect, it } from "vitest";

import {
  serializeFragment,
  serializePage,
  type MdsnFragment,
  type MdsnPage
} from "../../src/core/index.js";

describe("serializePage", () => {
  it("serializes frontmatter, markdown, and executable blocks", () => {
    const page: MdsnPage = {
      frontmatter: {
        title: "Guestbook"
      },
      markdown: "# Guestbook\n\n<!-- mdsn:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [
            { name: "nickname", type: "text", required: false, secret: false },
            { name: "message", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "GET",
              target: "/list",
              name: "refresh",
              inputs: [],
              label: "Refresh"
            },
            {
              method: "POST",
              target: "/post",
              name: "submit",
              inputs: ["nickname", "message"],
              label: "Submit"
            }
          ]
        }
      ],
      blockAnchors: ["guestbook"]
    };

    expect(serializePage(page)).toBe(`---
title: "Guestbook"
---

# Guestbook

## 2 live messages

- Welcome
- Hello

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (nickname, message) -> submit label:"Submit"
}
\`\`\`
`);
  });

  it("serializes every supported input type with its modifiers", () => {
    const page: MdsnPage = {
      frontmatter: {},
      markdown: "# Compose\n\n<!-- mdsn:block compose -->",
      blockContent: {
        compose: "## Draft"
      },
      blocks: [
        {
          name: "compose",
          inputs: [
            { name: "title", type: "text", required: false, secret: false },
            { name: "quantity", type: "number", required: true, secret: false },
            { name: "published", type: "boolean", required: false, secret: false },
            { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] },
            { name: "attachment", type: "asset", required: true, secret: false },
            { name: "password", type: "text", required: true, secret: true }
          ],
          operations: [
            {
              method: "POST",
              target: "/submit",
              name: "submit",
              inputs: ["title", "quantity", "published", "status", "attachment", "password"],
              label: "Submit"
            }
          ]
        }
      ],
      blockAnchors: ["compose"]
    };

    expect(serializePage(page)).toContain('INPUT text -> title');
    expect(serializePage(page)).toContain('INPUT number required -> quantity');
    expect(serializePage(page)).toContain('INPUT boolean -> published');
    expect(serializePage(page)).toContain('INPUT choice ["draft", "published"] -> status');
    expect(serializePage(page)).toContain('INPUT asset required -> attachment');
    expect(serializePage(page)).toContain('INPUT text required secret -> password');
  });

  it("only serializes currently visible blocks for page responses", () => {
    const page: MdsnPage = {
      frontmatter: {
        title: "Account"
      },
      markdown: "# Account\n\n<!-- mdsn:block auth -->\n\n<!-- mdsn:block vault -->",
      blockContent: {
        auth: "## Please sign in",
        vault: "## 0 saved notes"
      },
      blocks: [
        {
          name: "auth",
          inputs: [
            { name: "nickname", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "POST",
              target: "/login",
              name: "login",
              inputs: ["nickname"],
              label: "Sign In"
            }
          ]
        },
        {
          name: "vault",
          inputs: [
            { name: "message", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "POST",
              target: "/notes",
              name: "save",
              inputs: ["message"],
              label: "Save Note"
            }
          ]
        }
      ],
      blockAnchors: ["auth", "vault"],
      visibleBlockNames: ["auth"]
    };

    const markdown = serializePage(page);
    expect(markdown).toContain("## Please sign in");
    expect(markdown).toContain("BLOCK auth");
    expect(markdown).not.toContain("BLOCK vault");
    expect(markdown).not.toContain('POST "/notes" (message) -> save');
    expect(markdown).not.toContain("<!-- mdsn:block vault -->");
  });
});

describe("serializeFragment", () => {
  it("serializes markdown and blocks without frontmatter", () => {
    const fragment: MdsnFragment = {
      markdown: "## Messages",
      blocks: [
        {
          name: "messages",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/messages",
              name: "refresh",
              inputs: [],
              label: "Refresh"
            }
          ]
        }
      ]
    };

    expect(serializeFragment(fragment)).toBe(`## Messages

\`\`\`mdsn
BLOCK messages {
  GET "/messages" -> refresh label:"Refresh"
}
\`\`\`
`);
  });

  it("serializes explicit auto GET operations", () => {
    const fragment: MdsnFragment = {
      markdown: "## Messages",
      blocks: [
        {
          name: "messages",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/messages",
              name: "load_messages",
              inputs: [],
              auto: true
            }
          ]
        }
      ]
    };

    expect(serializeFragment(fragment)).toBe(`## Messages

\`\`\`mdsn
BLOCK messages {
  GET "/messages" -> load_messages auto
}
\`\`\`
`);
  });
});
