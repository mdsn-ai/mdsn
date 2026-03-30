import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createGuestbookServer } from "../../../examples/guestbook/src/index.js";
import { createStarterServer } from "../../../examples/starter/src/index.js";
import { createNodeHost } from "../src/index.js";

const servers = new Set<http.Server>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            servers.delete(server);
            resolve();
          });
        })
    )
  );
});

async function listen(listener: http.RequestListener): Promise<string> {
  const server = http.createServer(listener);
  servers.add(server);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function getMarkdown(url: string) {
  return fetch(url, {
    headers: {
      accept: "text/markdown"
    }
  });
}

async function postMarkdown(url: string, body: string) {
  return fetch(url, {
    method: "POST",
    headers: {
      accept: "text/markdown",
      "content-type": "text/markdown"
    },
    body
  });
}

async function readExampleGuestbookSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "guestbook", "pages", "guestbook.md"), "utf8");
}

async function readStarterGuestbookSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "starter", "pages", "guestbook.md"), "utf8");
}

describe("guestbook agent-only smoke test", () => {
  it("lets an agent self-discover the guestbook flow over HTTP only", async () => {
    const source = await readExampleGuestbookSource();
    const server = createGuestbookServer({
      source,
      initialMessages: ["Alpha", "Beta"]
    });
    const baseUrl = await listen(createNodeHost(server, { rootRedirect: "/guestbook" }));

    const page = await getMarkdown(`${baseUrl}/guestbook`);
    expect(page.status).toBe(200);
    const pageBody = await page.text();
    expect(pageBody).toContain("# Guestbook");
    expect(pageBody).toContain("## 2 live messages");
    expect(pageBody).toContain('GET "/list" -> refresh');
    expect(pageBody).toContain('POST "/post" (message) -> submit');

    const save = await postMarkdown(`${baseUrl}/post`, 'message: "Hello from agent smoke"');
    expect(save.status).toBe(200);
    const saveBody = await save.text();
    expect(saveBody).toContain("## 3 live messages");
    expect(saveBody).toContain("- Hello from agent smoke");
    expect(saveBody).toContain('GET "/list" -> refresh');

    const refresh = await getMarkdown(`${baseUrl}/list`);
    expect(refresh.status).toBe(200);
    const refreshBody = await refresh.text();
    expect(refreshBody).toContain("## 3 live messages");
    expect(refreshBody).toContain("- Alpha");
    expect(refreshBody).toContain("- Beta");
    expect(refreshBody).toContain("- Hello from agent smoke");
  });

  it("keeps the starter scaffold self-discoverable over HTTP only", async () => {
    const source = await readStarterGuestbookSource();
    const server = createStarterServer({
      source,
      initialMessages: ["First", "Second"]
    });
    const baseUrl = await listen(createNodeHost(server, { rootRedirect: "/guestbook" }));

    const page = await getMarkdown(`${baseUrl}/guestbook`);
    expect(page.status).toBe(200);
    const pageBody = await page.text();
    expect(pageBody).toContain("# Guestbook");
    expect(pageBody).toContain("## 2 live messages");
    expect(pageBody).toContain('GET "/list" -> refresh');
    expect(pageBody).toContain('POST "/post" (message) -> submit');

    const save = await postMarkdown(`${baseUrl}/post`, 'message: "Third from starter smoke"');
    expect(save.status).toBe(200);
    const saveBody = await save.text();
    expect(saveBody).toContain("## 3 live messages");
    expect(saveBody).toContain("- Third from starter smoke");

    const refresh = await getMarkdown(`${baseUrl}/list`);
    expect(refresh.status).toBe(200);
    const refreshBody = await refresh.text();
    expect(refreshBody).toContain("## 3 live messages");
    expect(refreshBody).toContain("- First");
    expect(refreshBody).toContain("- Second");
    expect(refreshBody).toContain("- Third from starter smoke");
  });
});
