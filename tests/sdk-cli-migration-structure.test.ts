import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

function rootPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

describe("phase b cli migration structure", () => {
  it("moves cli command implementations into sdk/src/cli", () => {
    expect(existsSync(rootPath("sdk", "src", "cli", "index.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "entry.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "commands", "build.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "commands", "create.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "commands", "dev.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "commands", "start.ts"))).toBe(true);
    expect(existsSync(rootPath("sdk", "src", "cli", "commands", "init.ts"))).toBe(false);
  });

  it("removes legacy src/cli wrapper files", () => {
    expect(existsSync(rootPath("src", "cli", "index.ts"))).toBe(false);
    expect(existsSync(rootPath("src", "cli", "commands", "build.ts"))).toBe(false);
  });
});
