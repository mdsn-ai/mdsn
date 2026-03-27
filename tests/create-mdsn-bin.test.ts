import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const rootsToCleanup: string[] = [];

afterEach(() => {
  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("create-mdsn bin", () => {
  it("forwards to the create command", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "create-mdsn-bin-"));
    rootsToCleanup.push(rootDir);

    const cliEntry = path.join(process.cwd(), "sdk", "dist", "cli", "entry.js");

    if (!existsSync(cliEntry)) {
      execFileSync("npm", ["run", "build", "--workspace", "@mdsnai/sdk"], {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    }

    execFileSync(process.execPath, [path.join(process.cwd(), "create-mdsn", "bin", "create-mdsn.js"), rootDir], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MDSN_CREATE_SKIP_INSTALL: "1",
      },
      stdio: "pipe",
    });

    expect(existsSync(path.join(rootDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "mdsn.config.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "pages", "index.md"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "actions.cjs"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "list.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "post.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "lib"))).toBe(false);
    expect(existsSync(path.join(rootDir, "layouts"))).toBe(false);
    expect(existsSync(path.join(rootDir, "public"))).toBe(false);
  });
});
