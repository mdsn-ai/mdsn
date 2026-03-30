import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parsePage, serializePage } from "@mdsn/core";
import { describe, expect, it } from "vitest";

function renderGuestbookBlock(messages: string[]): string {
  const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
  const list = messages.map((message) => `- ${message}`).join("\n");
  return `## ${count}\n\n${list}`;
}

describe("canonical page source", () => {
  it("loads guestbook from a real markdown file and preserves mdsn definitions", async () => {
    const filePath = join(process.cwd(), "examples", "guestbook", "pages", "guestbook.md");
    const source = await readFile(filePath, "utf8");
    const page = parsePage(source);
    page.blockContent = {
      guestbook: renderGuestbookBlock(["Welcome to MDSN", "Hello again"])
    };

    expect(page.markdown).not.toContain("2 live messages");
    expect(page.blocks[0]?.name).toBe("guestbook");
    expect(page.blockContent.guestbook).toContain("2 live messages");
    expect(page.blockContent.guestbook).toContain("- Welcome to MDSN");
    expect(serializePage(page)).toContain('POST "/post" (message) -> submit');
    expect(serializePage(page)).toContain("## 2 live messages");
  });
});
