import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { scaffoldStarterProject, toCompatibleSdkRange } from "../src/index.js";

describe("create-mdsn starter scaffold", () => {
  it("creates the starter with app-oriented structure and filled placeholders", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mdsn-create-"));
    const targetDir = join(parent, "my-mdsn-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "my-mdsn-app",
      sdkVersion: "0.1.0-test",
      runtime: "node"
    });

    const topLevelEntries = await readdir(targetDir);
    expect(topLevelEntries.sort()).toEqual(["README.md", "app", "index.mjs", "package.json", "tsconfig.json"]);

    const appEntries = await readdir(join(targetDir, "app"));
    expect(appEntries.sort()).toEqual(["client.ts", "index.md", "server.ts"]);

    const packageJson = await readFile(join(targetDir, "package.json"), "utf8");
    expect(packageJson).toContain('"name": "my-mdsn-app"');
    expect(packageJson).toContain('"@mdsnai/sdk": "0.1.0-test"');
    expect(packageJson).toContain('"start": "tsc -p tsconfig.json && node index.mjs"');

    const readme = await readFile(join(targetDir, "README.md"), "utf8");
    expect(readme).toContain("# my-mdsn-app");
    expect(readme).toContain("app/index.md");
    expect(readme).toContain("http://127.0.0.1:3000/");
    expect(readme).toContain("npm install");
    expect(readme).toContain("npm start");
    expect(readme).toContain("Node host");
    expect(readme).not.toContain("Bun-native");

    const indexSource = await readFile(join(targetDir, "index.mjs"), "utf8");
    expect(indexSource).toContain('import { createAppServer } from "./dist/server.js";');
    expect(indexSource).toContain('@mdsnai/sdk/server/node');
    expect(indexSource).toContain('"/app/client.js"');
    expect(indexSource).toContain("process.env.PORT || 3000");

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
        sdkVersion: "0.1.0-test",
        runtime: "node"
      })
    ).rejects.toThrow(/must be empty/);
  });

  it("can scaffold a starter with a compatible sdk range", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mdsn-create-latest-"));
    const targetDir = join(parent, "latest-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "latest-app",
      sdkVersion: toCompatibleSdkRange("0.4.2"),
      runtime: "node"
    });

    const packageJson = await readFile(join(targetDir, "package.json"), "utf8");
    expect(packageJson).toContain('"@mdsnai/sdk": "^0.4.0"');
  });

  it("can scaffold a Bun-native starter", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mdsn-create-bun-"));
    const targetDir = join(parent, "bun-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "bun-app",
      sdkVersion: "0.1.0-test",
      runtime: "bun"
    });

    const packageJson = await readFile(join(targetDir, "package.json"), "utf8");
    expect(packageJson).toContain('"start": "tsc -p tsconfig.json && bun run index.mjs"');

    const readme = await readFile(join(targetDir, "README.md"), "utf8");
    expect(readme).toContain("Bun host");
    expect(readme).toContain("bun install");
    expect(readme).toContain("bun start");
    expect(readme).toContain("without installing Node");

    const indexSource = await readFile(join(targetDir, "index.mjs"), "utf8");
    expect(indexSource).toContain('@mdsnai/sdk/server/bun');
    expect(indexSource).toContain("Bun.serve");
  });

  it("maps package versions to same-series sdk ranges", () => {
    expect(toCompatibleSdkRange("0.4.2")).toBe("^0.4.0");
    expect(toCompatibleSdkRange("1.3.7")).toBe("^1.3.0");
    expect(toCompatibleSdkRange("0.5.0-beta.1")).toBe("^0.5.0");
  });
});
