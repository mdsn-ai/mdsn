import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const rootsToCleanup: string[] = [];

afterEach(() => {
  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

function runDistCli(args: string[]): string {
  const cliEntry = path.join(process.cwd(), "sdk", "dist", "cli", "entry.js");

  if (!existsSync(cliEntry)) {
    execFileSync("npm", ["run", "build", "--workspace", "@mdsnai/sdk"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  }

  return execFileSync(process.execPath, [cliEntry, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      MDSN_CREATE_SKIP_INSTALL: "1",
    },
  });
}

describe("sdk distributed cli", () => {
  it("can create and build a starter site using node + dist entry", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-sdk-dist-cli-"));
    rootsToCleanup.push(rootDir);

    runDistCli(["create", "--cwd", rootDir]);

    expect(existsSync(path.join(rootDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "mdsn.config.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "actions.cjs"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "list.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "post.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "lib"))).toBe(false);
    expect(existsSync(path.join(rootDir, "layouts"))).toBe(false);
    expect(existsSync(path.join(rootDir, "public"))).toBe(false);

    const buildOutput = runDistCli(["build", "--cwd", rootDir]);
    expect(buildOutput).toContain("MDSN build complete");

    expect(existsSync(path.join(rootDir, "dist", "manifest", "pages.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "manifest", "actions.json"))).toBe(true);

    expect(JSON.parse(readFileSync(path.join(rootDir, "dist", "manifest", "actions.json"), "utf8"))).toEqual([
      { id: "list", file: "actions.cjs", exportName: "list" },
      { id: "post", file: "actions.cjs", exportName: "post" },
    ]);
  });
});
