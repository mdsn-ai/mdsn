import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createReactStarterServer } from "../../../examples/react-starter/src/index.js";

async function readReactStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "react-starter", "pages", "guestbook.md"), "utf8");
}

describe("react starter example", () => {
  it("keeps the server side as thin as the base starter", async () => {
    const source = (await readReactStarterSource()).replace("# Guestbook", "# React Starter Guestbook");
    const server = createReactStarterServer({
      source,
      initialMessages: ["React One", "React Two"]
    });

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.body).toContain("# React Starter Guestbook");
    expect(pageResponse.body).toContain("## 2 live messages");
    expect(pageResponse.body).toContain("- React One");
    expect(pageResponse.body).toContain("- React Two");

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "React Three"',
      cookies: {}
    });

    expect(postResponse.body).toContain("## 3 live messages");
    expect(postResponse.body).toContain("- React Three");
  });

  it("keeps the browser entry client-only and React-hosted", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "react-starter", "src", "client.tsx"), "utf8");
    const devSource = await readFile(join(process.cwd(), "examples", "react-starter", "dev.mjs"), "utf8");

    expect(clientSource).toContain('from "react"');
    expect(clientSource).toContain('from "react-dom/client"');
    expect(clientSource).toContain('from "marked"');
    expect(clientSource).toContain("@mdsnai/sdk/web");
    expect(clientSource).toContain("createHeadlessHost");
    expect(clientSource).toContain("dangerouslySetInnerHTML");
    expect(clientSource).not.toContain("@mdsnai/sdk/elements");
    expect(clientSource).not.toContain("@mdsnai/sdk/server");
    expect(clientSource).not.toContain("parseRenderableMarkdown");

    expect(devSource).toContain('from "esbuild"');
    expect(devSource).toContain("client.browser.js");
    expect(devSource).not.toContain('/node_modules/react/index.js');
    expect(devSource).not.toContain('/node_modules/react-dom/client.js');
  });
});
