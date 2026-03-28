import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStarterSite } from "../sdk/src/server/init";

const rootsToCleanup: string[] = [];

afterEach(() => {
  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("framework starter site scaffold", () => {
  it("creates a complete starter project", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-framework-init-"));
    rootsToCleanup.push(rootDir);

    createStarterSite(rootDir);

    expect(existsSync(path.join(rootDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "mdsn.config.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "pages", "index.md"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "actions.cjs"))).toBe(true);
    expect(existsSync(path.join(rootDir, "server", "list.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "post.cjs"))).toBe(false);
    expect(existsSync(path.join(rootDir, "layouts"))).toBe(false);
    expect(existsSync(path.join(rootDir, "public"))).toBe(false);
    expect(existsSync(path.join(rootDir, "README.md"))).toBe(true);
    expect(existsSync(path.join(rootDir, "mdsn.config.ts"))).toBe(false);
    expect(existsSync(path.join(rootDir, "server", "lib"))).toBe(false);
  });

  it("writes a starter page, action, and package files that are ready to run", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-framework-init-"));
    rootsToCleanup.push(rootDir);

    createStarterSite(rootDir);

    const starterPage = readFileSync(path.join(rootDir, "pages", "index.md"), "utf8");
    const actionsFile = readFileSync(path.join(rootDir, "server", "actions.cjs"), "utf8");
    const packageJson = readFileSync(path.join(rootDir, "package.json"), "utf8");
    const readme = readFileSync(path.join(rootDir, "README.md"), "utf8");

    expect(starterPage).toContain("id: guestbook");
    expect(starterPage).not.toContain("layout: default");
    expect(starterPage).toContain("<!-- mdsn:block guestbook -->");
    expect(starterPage).toContain("block guestbook {");
    expect(starterPage).toContain('GET "/list" -> refresh');
    expect(starterPage).toContain('POST "/post" (nickname, message) -> submit');

    expect(actionsFile).toContain('require("@mdsnai/sdk/server")');
    expect(actionsFile).toContain("defineActions");
    expect(actionsFile).toContain("renderMarkdownFragment");
    expect(actionsFile).toContain("renderMarkdownValue");
    expect(actionsFile).toContain("listGuestbookMessages");
    expect(actionsFile).toContain("addGuestbookMessage");
    expect(actionsFile).toContain("Please enter a message before submitting.");
    expect(actionsFile).toContain('name: "guestbook"');
    expect(packageJson).toContain('"dev": "mdsn dev"');
    expect(packageJson).toContain('"@mdsnai/sdk"');
    expect(readme).toContain("runnable guestbook");
    expect(readme).toContain("npm run dev");
    expect(readme).toContain("server/actions.cjs");
    expect(readme).toContain("`mdsn.config.cjs` when you need custom settings");
    expect(readme).toContain("`layouts/default.html` when you want a custom layout");
    expect(readme).not.toContain("server/lib");
  });
});
