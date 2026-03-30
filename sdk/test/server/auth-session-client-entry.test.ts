import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("auth-session browser entry", () => {
  it("stays client-only and does not import the server entry", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "auth-session", "src", "client.ts"), "utf8");

    expect(clientSource).toContain('@mdsnai/sdk/elements');
    expect(clientSource).toContain('@mdsnai/sdk/web');
    expect(clientSource).toContain('mountMdsnElements');
    expect(clientSource).toContain('createHeadlessHost');
    expect(clientSource).not.toContain('@mdsnai/sdk/server');
    expect(clientSource).not.toContain('./index.js');
  });
});
