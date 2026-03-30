import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { scaffoldStarterProject } from "../src/index.js";

describe("create-mdsn starter scaffold", () => {
  it("creates the starter with app-oriented structure and filled placeholders", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mdsn-create-"));
    const targetDir = join(parent, "my-mdsn-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "my-mdsn-app",
      sdkVersion: "0.1.0-test"
    });

    const topLevelEntries = await readdir(targetDir);
    expect(topLevelEntries.sort()).toEqual(["README.md", "app", "index.mjs", "package.json", "tsconfig.json"]);

    const appEntries = await readdir(join(targetDir, "app"));
    expect(appEntries.sort()).toEqual(["client.ts", "guestbook.md", "server.ts"]);

    const packageJson = await readFile(join(targetDir, "package.json"), "utf8");
    expect(packageJson).toContain('"name": "my-mdsn-app"');
    expect(packageJson).toContain('"@mdsn/server": "^0.1.0-test"');

    const readme = await readFile(join(targetDir, "README.md"), "utf8");
    expect(readme).toContain("# my-mdsn-app");
    expect(readme).toContain("app/guestbook.md");

    const indexSource = await readFile(join(targetDir, "index.mjs"), "utf8");
    expect(indexSource).toContain('import { createAppServer } from "./dist/server.js";');
    expect(indexSource).toContain('"/app/client.js"');

    const serverSource = await readFile(join(targetDir, "app", "server.ts"), "utf8");
    expect(serverSource).toContain("createHostedApp");
    expect(serverSource).toContain('target: "/post"');
  });

  it("rejects scaffolding into a non-empty target directory", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mdsn-create-"));
    await writeFile(join(parent, "keep.txt"), "occupied", "utf8");

    await expect(
      scaffoldStarterProject({
        targetDir: parent,
        projectName: "already-here",
        sdkVersion: "0.1.0-test"
      })
    ).rejects.toThrow(/must be empty/);
  });
});
