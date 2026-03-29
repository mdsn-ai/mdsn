import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type SdkPackage = {
  private?: boolean;
  main?: string;
  types?: string;
  description?: string;
  license?: string;
  repository?: unknown;
  homepage?: string;
  bugs?: unknown;
  keywords?: string[];
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  exports?: Record<string, unknown>;
};

function readSdkPackageJson(): SdkPackage {
  const filePath = path.join(process.cwd(), "sdk", "package.json");
  return JSON.parse(readFileSync(filePath, "utf8")) as SdkPackage;
}

describe("sdk package metadata", () => {
  it("is configured for dist-based package publishing", () => {
    const pkg = readSdkPackageJson();

    expect(pkg.private).toBe(false);
    expect(pkg.main).toBe("./dist/index.js");
    expect(pkg.types).toBe("./dist/index.d.ts");
    expect(pkg.bin).toMatchObject({
      mdsn: "./dist/cli/entry.js",
    });
    expect(pkg.files).toEqual(expect.arrayContaining(["dist", "README.md", "LICENSE"]));
  });

  it("declares standard package metadata", () => {
    const pkg = readSdkPackageJson();

    expect(pkg.description).toBeTruthy();
    expect(pkg.license).toBe("MIT");
    expect(pkg.repository).toBeTruthy();
    expect(pkg.homepage).toBeTruthy();
    expect(pkg.bugs).toBeTruthy();
    expect(pkg.keywords?.length).toBeGreaterThan(0);
  });

  it("defines dist-based exports for all public sdk layers", () => {
    const pkg = readSdkPackageJson();
    const exportsMap = pkg.exports as Record<string, { types: string; import: string; require: string; default: string }>;

    expect(exportsMap["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      require: "./dist/index.js",
      default: "./dist/index.js",
    });
    expect(exportsMap["./core"]).toEqual({
      types: "./dist/core/index.d.ts",
      import: "./dist/core/index.js",
      require: "./dist/core/index.js",
      default: "./dist/core/index.js",
    });
    expect(exportsMap["./web"]).toEqual({
      types: "./dist/web/index.d.ts",
      import: "./dist/web/index.js",
      require: "./dist/web/index.js",
      default: "./dist/web/index.js",
    });
    expect(exportsMap["./server"]).toEqual({
      types: "./dist/server/index.d.ts",
      import: "./dist/server/index.js",
      require: "./dist/server/index.js",
      default: "./dist/server/index.js",
    });
    expect(exportsMap["./framework"]).toEqual({
      types: "./dist/framework/index.d.ts",
      import: "./dist/framework/index.js",
      require: "./dist/framework/index.js",
      default: "./dist/framework/index.js",
    });
    expect(exportsMap["./cli"]).toEqual({
      types: "./dist/cli/index.d.ts",
      import: "./dist/cli/index.js",
      require: "./dist/cli/index.js",
      default: "./dist/cli/index.js",
    });
    expect(exportsMap["./parser"]).toBeUndefined();
    expect(exportsMap["./runtime-core"]).toBeUndefined();
    expect(exportsMap["./runtime-web"]).toBeUndefined();
    expect(exportsMap["./host-node"]).toBeUndefined();
    expect(exportsMap["./html"]).toBeUndefined();
  });

  it("provides a dedicated TypeScript build script for sdk dist output", () => {
    const pkg = readSdkPackageJson();

    expect(pkg.scripts?.build).toContain("rmSync('dist'");
    expect(pkg.scripts?.build).toContain("tsc -p tsconfig.build.json");
  });

  it("includes readme and license in the published tarball", () => {
    const output = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json", "--workspace", "@mdsnai/sdk"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, npm_config_cache: path.join(process.cwd(), ".npmcache-test") },
      },
    );
    const pack = JSON.parse(output)[0];
    const filePaths = pack.files.map((file: { path: string }) => file.path);

    expect(filePaths).toContain("README.md");
    expect(filePaths).toContain("LICENSE");
  });

  it("documents the root-first sdk entrypoint in the published readme", () => {
    const readme = readFileSync(path.join(process.cwd(), "sdk", "README.md"), "utf8");

    expect(readme).toContain('import { createFrameworkApp, defineConfig } from "@mdsnai/sdk";');
    expect(readme).toContain("createHostedApp");
    expect(readme).toContain("createActionContextFromRequest");
    expect(readme).toContain("Use the root entry point for the common paths:");
  });

  it("keeps dist free of stale internal build artifacts", () => {
    expect(existsSync(path.join(process.cwd(), "sdk", "dist", "host-node", "app.js"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "sdk", "dist", "host-node", "guestbook-api.js"))).toBe(false);
    expect(existsSync(path.join(process.cwd(), "sdk", "dist", "runtime-web", "html.js"))).toBe(false);
  });
});
