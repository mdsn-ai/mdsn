import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import packageJson from "../package.json";

describe("framework package metadata", () => {
  it("exposes the mdsn bin through a dedicated wrapper", () => {
    expect(packageJson.bin).toMatchObject({
      mdsn: "./bin/mdsn.js",
    });
  });

  it("provides framework scripts for local usage", () => {
    expect(packageJson.scripts).toMatchObject({
      "framework:dev": "npm run -w @mdsnai/sdk framework:dev --",
      "framework:start": "npm run -w @mdsnai/sdk framework:start --",
      "framework:build": "npm run -w @mdsnai/sdk framework:build",
      "framework:create": "npm run -w @mdsnai/sdk framework:create",
    });
  });

  it("uses a bin wrapper that forwards argv to runCli", () => {
    const wrapper = readFileSync(path.join(process.cwd(), "bin", "mdsn.js"), "utf8");

    expect(wrapper).toContain("runCli(process.argv.slice(2))");
  });
});
