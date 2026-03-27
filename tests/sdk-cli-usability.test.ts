import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "../sdk/src/cli";

const rootsToCleanup: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();

  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("sdk cli usability", () => {
  it("creates a runnable starter project in a target directory and then builds it", async () => {
    const workspaceDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-usable-"));
    rootsToCleanup.push(workspaceDir);

    vi.stubEnv("MDSN_CREATE_SKIP_INSTALL", "1");
    await runCli(["create", "--cwd", workspaceDir, "demo-site"]);

    const siteRoot = path.join(workspaceDir, "demo-site");
    expect(existsSync(path.join(siteRoot, "package.json"))).toBe(true);
    expect(existsSync(path.join(siteRoot, "mdsn.config.cjs"))).toBe(false);
    expect(existsSync(path.join(siteRoot, "pages", "index.md"))).toBe(true);
    expect(existsSync(path.join(siteRoot, "server", "actions.cjs"))).toBe(true);
    expect(existsSync(path.join(siteRoot, "server", "list.cjs"))).toBe(false);
    expect(existsSync(path.join(siteRoot, "server", "post.cjs"))).toBe(false);
    expect(existsSync(path.join(siteRoot, "server", "lib"))).toBe(false);
    expect(existsSync(path.join(siteRoot, "public"))).toBe(false);
    expect(existsSync(path.join(siteRoot, "layouts"))).toBe(false);

    const packageJson = JSON.parse(readFileSync(path.join(siteRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      dev: "mdsn dev",
      build: "mdsn build",
      start: "mdsn start",
    });
    expect(packageJson.dependencies).toMatchObject({
      "@mdsnai/sdk": "^0.1.0",
    });

    await runCli(["build", "--cwd", siteRoot]);

    expect(existsSync(path.join(siteRoot, "dist", "manifest", "pages.json"))).toBe(true);
    expect(existsSync(path.join(siteRoot, "dist", "manifest", "actions.json"))).toBe(true);
  });

  it("rejects more than one target directory for create", async () => {
    await expect(runCli(["create", "demo-site", "extra-site"])).rejects.toThrow(
      "create accepts at most one target directory",
    );
  });
});
