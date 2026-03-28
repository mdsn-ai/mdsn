import { describe, expect, it } from "vitest";
import { parseFragment, parseMarkdown, parsePage } from "../sdk/src/web";

describe("web headless api", () => {
  it("parses markdown into structured nodes", () => {
    const nodes = parseMarkdown(`# Title

Hello **world**.

- one
- two
`);

    expect(nodes).toEqual([
      {
        type: "heading",
        depth: 1,
        children: [{ type: "text", value: "Title" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", value: "Hello " },
          {
            type: "strong",
            children: [{ type: "text", value: "world" }],
          },
          { type: "text", value: "." },
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [
          [{ type: "paragraph", children: [{ type: "text", value: "one" }] }],
          [{ type: "paragraph", children: [{ type: "text", value: "two" }] }],
        ],
      },
    ]);
  });

  it("parses a page into containers, anchors, and blocks", () => {
    const page = parsePage(`---
title: Demo
---

# Intro

Before block.

<!-- mdsn:block chat -->

After block.

\`\`\`mdsn
block chat {
  INPUT text required -> message
  POST "/send" (message) -> send
}
\`\`\`
`);

    expect(page.frontmatter).toEqual({ title: "Demo" });
    expect(page.containers.map((container) => container.markdown.trim())).toEqual([
      "# Intro\n\nBefore block.",
      "After block.",
    ]);
    expect(page.anchors).toEqual([{ name: "chat" }]);
    expect(page.blocks.map((block) => block.name)).toEqual(["chat"]);
    expect(page.segments.map((segment) => segment.type)).toEqual(["container", "anchor", "container"]);
  });

  it("parses a fragment into containers and one optional block", () => {
    const fragment = parseFragment(`## Latest

- hello

\`\`\`mdsn
block guestbook {
  INPUT text required -> message
  POST "/post" (message) -> submit
}
\`\`\`
`);

    expect(fragment.containers.map((container) => container.markdown.trim())).toEqual([
      "## Latest\n\n- hello",
    ]);
    expect(fragment.block?.name).toBe("guestbook");
    expect(fragment.segments.map((segment) => segment.type)).toEqual(["container", "block"]);
  });

  it("preserves fragment segment order around an executable block", () => {
    const fragment = parseFragment(`Before block.

\`\`\`mdsn
block chat {
  INPUT text required -> message
  POST "/send" (message) -> send
}
\`\`\`

After block.
`);

    expect(fragment.segments.map((segment) => segment.type)).toEqual([
      "container",
      "block",
      "container",
    ]);
    expect(fragment.segments[0]?.type).toBe("container");
    expect(fragment.segments[0]?.type === "container" ? fragment.segments[0].container.markdown.trim() : "").toBe("Before block.");
    expect(fragment.segments[1]?.type).toBe("block");
    expect(fragment.segments[2]?.type).toBe("container");
    expect(fragment.segments[2]?.type === "container" ? fragment.segments[2].container.markdown.trim() : "").toBe("After block.");
  });
});
