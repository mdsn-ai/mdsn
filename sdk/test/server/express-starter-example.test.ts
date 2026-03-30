import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createExpressStarterServer } from "../../../examples/express-starter/src/index.js";
import { createExpressMdsnHandler } from "../../../examples/express-starter/src/express-adapter.js";

async function readExpressStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "express-starter", "pages", "guestbook.md"), "utf8");
}

describe("express starter example", () => {
  it("is a minimal scaffold that behaves like the default starter", async () => {
    const source = await readExpressStarterSource();
    const server = createExpressStarterServer({
      source,
      initialMessages: ["First"]
    });

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Second"',
      cookies: {}
    });

    expect(postResponse.body).toContain("## 2 live messages");
    expect(postResponse.body).toContain("- Second");
  });

  it("bridges Express urlencoded bodies into mdsn markdown writes", async () => {
    const source = await readExpressStarterSource();
    const server = createExpressStarterServer({ source });
    const handler = createExpressMdsnHandler(server);

    let statusCode = 200;
    const headers = new Map<string, string>();
    let body = "";

    await handler(
      {
        method: "POST",
        originalUrl: "/post",
        protocol: "https",
        headers: {
          accept: "text/markdown",
          "content-type": "application/x-www-form-urlencoded",
          host: "example.test"
        },
        body: { message: "From Express" },
        get(name) {
          return this.headers[name.toLowerCase()];
        }
      },
      {
        status(code) {
          statusCode = code;
          return this;
        },
        setHeader(name, value) {
          headers.set(name.toLowerCase(), value);
          return this;
        },
        write(chunk) {
          body += chunk;
        },
        end(chunk) {
          if (chunk) {
            body += chunk;
          }
        }
      }
    );

    expect(statusCode).toBe(200);
    expect(headers.get("content-type")).toBe("text/markdown");
    expect(body).toContain("From Express");
  });

  it("documents a real express runtime shell in dev.mjs", async () => {
    const devSource = await readFile(join(process.cwd(), "examples", "express-starter", "dev.mjs"), "utf8");

    expect(devSource).toContain('from "express"');
    expect(devSource).toContain("express.urlencoded");
    expect(devSource).toContain("createExpressMdsnHandler");
  });
});
