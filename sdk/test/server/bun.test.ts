// @vitest-environment node

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createMdsnServer, ok, stream } from "../../src/server/index.js";
import { createHost } from "@mdsnai/sdk/server/bun";

describe("bun host adapter", () => {
  it("bridges requests into the shared server runtime", async () => {
    const server = createMdsnServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "## Bun hello",
          blocks: []
        }
      })
    );

    const host = createHost(server);
    const response = await host(
      new Request("https://example.test/list", {
        headers: { accept: "text/markdown" }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    await expect(response.text()).resolves.toContain("## Bun hello");
  });

  it("normalizes form posts and cookies", async () => {
    const server = createMdsnServer();

    server.post("/submit", async ({ inputs, request }) =>
      ok({
        fragment: {
          markdown: `## Saved ${inputs.message ?? ""} for ${request.cookies.user ?? "guest"}`,
          blocks: []
        }
      })
    );

    const host = createHost(server);
    const response = await host(
      new Request("https://example.test/submit", {
        method: "POST",
        headers: {
          accept: "text/markdown",
          "content-type": "application/x-www-form-urlencoded",
          cookie: "user=Agent"
        },
        body: new URLSearchParams({ message: "From Bun form" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("## Saved From Bun form for Agent");
  });

  it("serves static files, redirects root, and streams event-stream responses", async () => {
    const staticRoot = await mkdtemp(join(tmpdir(), "mdsn-bun-host-"));
    const filePath = join(staticRoot, "hello.txt");
    await writeFile(filePath, "static bun asset", "utf8");

    const server = createMdsnServer();
    server.get("/stream", async () =>
      stream(
        (async function* () {
          yield {
            markdown: "## Tick",
            blocks: []
          };
          yield {
            markdown: "## Tock",
            blocks: []
          };
        })()
      )
    );

    const host = createHost(server, {
      rootRedirect: "/docs",
      staticMounts: [{ urlPrefix: "/assets/", directory: staticRoot }]
    });

    const redirect = await host(new Request("https://example.test/"));
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("/docs");

    const asset = await host(new Request("https://example.test/assets/hello.txt"));
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("text/plain");
    await expect(asset.text()).resolves.toBe("static bun asset");

    const streamResponse = await host(
      new Request("https://example.test/stream", {
        headers: { accept: "text/event-stream" }
      })
    );
    expect(streamResponse.headers.get("content-type")).toContain("text/event-stream");
    const body = await streamResponse.text();
    expect(body).toContain("data: ## Tick");
    expect(body).toContain("data: ## Tock");
  });

  it("does not serve files for lookalike static mount prefixes", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "mdsn-bun-host-prefix-"));
    const publicDir = join(tempRoot, "public");
    await mkdir(join(publicDir, "-evil"), { recursive: true });
    await writeFile(join(publicDir, "-evil", "secret.txt"), "secret", "utf8");

    const server = createMdsnServer();
    const host = createHost(server, {
      staticMounts: [{ urlPrefix: "/public", directory: publicDir }]
    });

    const response = await host(
      new Request("https://example.test/public-evil/secret.txt", {
        headers: { accept: "text/markdown" }
      })
    );

    expect(response.status).toBe(404);
  });

  it("serves root-mounted static files from top-level paths", async () => {
    const staticRoot = await mkdtemp(join(tmpdir(), "mdsn-bun-host-root-"));
    await writeFile(join(staticRoot, "site.css"), "body { color: red; }", "utf8");

    const server = createMdsnServer();
    const host = createHost(server, {
      staticMounts: [{ urlPrefix: "/", directory: staticRoot }]
    });

    const response = await host(new Request("https://example.test/site.css"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    await expect(response.text()).resolves.toContain("color: red");
  });
});
