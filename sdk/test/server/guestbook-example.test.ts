import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createGuestbookServer } from "../../../examples/guestbook/src/index.js";

async function readGuestbookSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "guestbook", "pages", "guestbook.md"), "utf8");
}

describe("guestbook example", () => {
  it("keeps the example boundary at page source plus business state", async () => {
    const source = (await readGuestbookSource()).replace("# Guestbook", "# SDK Guestbook");
    const server = createGuestbookServer({
      source,
      initialMessages: ["Alpha", "Beta"]
    });

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.body).toContain("# SDK Guestbook");
    expect(pageResponse.body).toContain("## 2 live messages");
    expect(pageResponse.body).toContain("- Alpha");
    expect(pageResponse.body).toContain("- Beta");
    expect(pageResponse.body).toContain("<!-- mdsn:block guestbook -->");

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Hello from example"',
      cookies: {}
    });

    expect(postResponse.body).not.toContain('title: "Guestbook"');
    expect(postResponse.body).toContain("## 3 live messages");
    expect(postResponse.body).toContain("- Alpha");
    expect(postResponse.body).toContain("- Beta");
    expect(postResponse.body).toContain("- Hello from example");
    expect(postResponse.body).toContain('POST "/post" (message) -> submit');
  });
});
