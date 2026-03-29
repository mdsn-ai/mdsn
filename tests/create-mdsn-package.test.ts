import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function rootPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

describe("create-mdsn package", () => {
  it("exists as a dedicated npm create entry package", () => {
    expect(existsSync(rootPath("create-mdsn", "package.json"))).toBe(true);
    expect(existsSync(rootPath("create-mdsn", "README.md"))).toBe(true);
    expect(existsSync(rootPath("create-mdsn", "LICENSE"))).toBe(true);
  });

  it("declares npm-create package metadata", () => {
    const packageJson = JSON.parse(readFileSync(rootPath("create-mdsn", "package.json"), "utf8"));

    expect(packageJson.name).toBe("create-mdsn");
    expect(packageJson.description).toBeTruthy();
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository).toBeTruthy();
    expect(packageJson.homepage).toBeTruthy();
    expect(packageJson.bugs).toBeTruthy();
    expect(packageJson.keywords?.length).toBeGreaterThan(0);
    expect(packageJson.bin).toMatchObject({
      "create-mdsn": expect.any(String),
    });
    expect(packageJson.files).toEqual(expect.arrayContaining(["bin", "README.md", "LICENSE"]));
    expect(packageJson.dependencies).toMatchObject({
      "@mdsnai/sdk": "0.2.1",
    });
  });

  it("forwards into the published sdk cli entrypoint", () => {
    const binSource = readFileSync(rootPath("create-mdsn", "bin", "create-mdsn.js"), "utf8");

    expect(binSource).toContain('require("@mdsnai/sdk/cli")');
    expect(binSource).toContain('runCli(["create"');
  });

  it("includes readme and license in the published tarball", () => {
    const output = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json", "--workspace", "create-mdsn"],
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
});
