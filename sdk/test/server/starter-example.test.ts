import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createStarterServer } from "../../../examples/starter/src/index.js";

async function readStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "starter", "pages", "guestbook.md"), "utf8");
}

describe("starter example", () => {
  it("is a self-contained minimal scaffold", async () => {
    const source = (await readStarterSource()).replace("# Guestbook", "# Starter Guestbook");
    const server = createStarterServer({
      source,
      initialMessages: ["First", "Second"]
    });

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.body).toContain("# Starter Guestbook");
    expect(pageResponse.body).toContain("## 2 live messages");
    expect(pageResponse.body).toContain("- First");
    expect(pageResponse.body).toContain("- Second");

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Third"',
      cookies: {}
    });

    expect(postResponse.body).toContain("## 3 live messages");
    expect(postResponse.body).toContain("- Third");
    expect(postResponse.body).not.toContain('title: "Guestbook"');
  });
});
