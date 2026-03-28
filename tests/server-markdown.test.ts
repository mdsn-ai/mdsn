import { describe, expect, it } from "vitest";
import {
  renderMarkdownFragment,
  renderMarkdownValue,
  serializeBlock,
} from "../sdk/src/server";

describe("server markdown helpers", () => {
  it("renders built-in markdown value types", () => {
    expect(renderMarkdownValue("text", "Hello")).toBe("Hello");
    expect(
      renderMarkdownValue("list", ["**A**: hello", "**B**: hi"]),
    ).toBe("- **A**: hello\n- **B**: hi");
    expect(
      renderMarkdownValue("table", {
        columns: ["name", "message"],
        rows: [["A", "hello"], ["B", "hi"]],
      }),
    ).toBe([
      "| name | message |",
      "| --- | --- |",
      "| A | hello |",
      "| B | hi |",
    ].join("\n"));
  });

  it("serializes a block definition into an executable mdsn code block", () => {
    expect(
      serializeBlock({
        name: "guestbook",
        inputs: [
          { name: "nickname", type: "text" },
          { name: "message", type: "text", required: true },
        ],
        reads: [{ name: "refresh", target: "/list" }],
        writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
      }),
    ).toBe([
      "```mdsn",
      "block guestbook {",
      "  INPUT text -> nickname",
      "  INPUT text required -> message",
      '  GET "/list" -> refresh',
      '  POST "/post" (nickname, message) -> submit',
      "}",
      "```",
    ].join("\n"));
  });

  it("renders a complete markdown fragment from body and block", () => {
    const fragment = renderMarkdownFragment({
      body: [
        "## Messages",
        renderMarkdownValue("list", ["**A**: hello"]),
      ],
      block: {
        name: "guestbook",
        inputs: [
          { name: "nickname", type: "text" },
          { name: "message", type: "text", required: true },
        ],
        reads: [{ name: "refresh", target: "/list" }],
        writes: [{ name: "submit", target: "/post", inputs: ["nickname", "message"] }],
      },
    });

    expect(fragment).toContain("## Messages");
    expect(fragment).toContain("- **A**: hello");
    expect(fragment).toContain("```mdsn");
    expect(fragment).toContain('POST "/post" (nickname, message) -> submit');
  });
});
