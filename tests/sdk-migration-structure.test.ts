import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

function rootPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

describe("phase b migration structure", () => {
  it("keeps the new sdk layers as the top-level source contract", () => {
    expect(existsSync(rootPath("sdk", "src", "core", "index.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "core", "document", "page-definition.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "core", "protocol", "mdsn.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "core", "action", "execution.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "web", "index.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "server", "index.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "server", "page-host.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "framework", "index.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "framework", "create-framework-app.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "index.ts"))).toBe(true);
  });

  it("removes the legacy root src wrapper layers", () => {
    expect(existsSync(rootPath("src"))).toBe(false);
    expect(existsSync(rootPath("src", "parser", "page-definition.ts"))).toBe(false);
    expect(existsSync(rootPath("src", "shared", "types.ts"))).toBe(false);
  });

  it("removes legacy sdk internal implementation directories", () => {
    expect(existsSync(rootPath("sdk", "src", "parser"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "runtime-core"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "runtime-web"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "host-node"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "framework", "server"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "core", "parser"))).toBe(false);
    expect(existsSync(rootPath("sdk", "src", "core", "runtime"))).toBe(false);
  });
});
