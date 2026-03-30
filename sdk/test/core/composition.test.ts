import { describe, expect, it } from "vitest";

import * as core from "../../src/core/index.js";
import { composePage } from "../../src/core/index.js";

describe("composePage", () => {
  it("keeps block extraction on the composed page instead of the package root API", () => {
    expect("fragmentForBlock" in core).toBe(false);
  });

  it("parses canonical source and applies runtime block markdown", () => {
    const page = composePage(
      `---
title: Guestbook
---

# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  INPUT text required -> message
  POST "/post" (message) -> submit label:"Submit"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
        }
      }
    );

    expect(page.frontmatter.title).toBe("Guestbook");
    expect(page.blockContent).toEqual({
      guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
    });
    expect(page.blocks[0]?.name).toBe("guestbook");
  });

  it("validates page structure while composing", () => {
    expect(() =>
      composePage(`# Demo

<!-- mdsn:block missing -->

\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh
}
\`\`\`
`)
    ).toThrow(/does not match any BLOCK/);
  });

  it("returns a composed page with a fragment helper for block-scoped responses", () => {
    const page = composePage(
      `# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh label:"Refresh"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 1 live message\n\n- Welcome"
        }
      }
    );

    expect(page.fragment("guestbook")).toEqual({
      markdown: "## 1 live message\n\n- Welcome",
      blocks: [page.blocks[0]]
    });
  });

  it("can hide block definitions from the serialized page while keeping them internally available", () => {
    const page = composePage(
      `# Account

<!-- mdsn:block auth -->

<!-- mdsn:block vault -->

\`\`\`mdsn
BLOCK auth {
  INPUT text -> nickname
  INPUT text -> password
  POST "/login" (nickname, password) -> login label:"Sign In"
}

BLOCK vault {
  GET "/notes" -> refresh label:"Refresh Notes"
}
\`\`\`
`,
      {
        blocks: {
          auth: "## Please sign in",
          vault: "## 0 saved notes"
        },
        visibleBlocks: ["auth"]
      }
    );

    expect(page.blocks.map((block) => block.name)).toEqual(["auth", "vault"]);
    expect(page.visibleBlockNames).toEqual(["auth"]);
    expect(page.fragment("vault")).toEqual({
      markdown: "## 0 saved notes",
      blocks: [page.blocks[1]]
    });
  });
});

describe("page.fragment", () => {
  it("extracts a block-scoped fragment from a composed page", () => {
    const page = composePage(
      `# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 3 live messages\n\n- Welcome\n- Hello\n- Hi"
        }
      }
    );

    expect(page.fragment("guestbook")).toEqual({
      markdown: "## 3 live messages\n\n- Welcome\n- Hello\n- Hi",
      blocks: [page.blocks[0]]
    });
  });

  it("throws when the requested block does not exist", () => {
    const page = composePage(
      `# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh label:"Refresh"
}
\`\`\`
`
    );

    expect(() => page.fragment("missing")).toThrow(/Unknown block "missing"/);
  });

  it("throws when the block exists but no runtime content was composed", () => {
    const page = composePage(
      `# Guestbook

<!-- mdsn:block guestbook -->

\`\`\`mdsn
BLOCK guestbook {
  GET "/list" -> refresh label:"Refresh"
}
\`\`\`
`
    );

    expect(() => page.fragment("guestbook")).toThrow(/Block "guestbook" has no composed markdown content/);
  });
});
