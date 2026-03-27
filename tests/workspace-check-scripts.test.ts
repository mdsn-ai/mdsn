import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function rootPath(...segments: string[]): string {
  return path.join(projectRoot, ...segments);
}

describe("workspace quality scripts", () => {
  it("forwards cli args through root dev/start scripts", () => {
    const rootPackageJson = JSON.parse(readFileSync(rootPath("package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(rootPackageJson.scripts).toMatchObject({
      dev: "npm run -w @mdsn/examples guestbook:dev --",
      start: "npm run -w @mdsn/examples guestbook:start --",
      "framework:dev": "npm run -w @mdsnai/sdk framework:dev --",
      "framework:start": "npm run -w @mdsnai/sdk framework:start --",
      "docs:dev": "npm run -w @mdsn/docs dev --",
      "docs:start": "npm run -w @mdsn/docs start --",
    });
  });

  it("wires docs:check to a real spec consistency test", () => {
    const docsPackageJson = JSON.parse(readFileSync(rootPath("docs", "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(docsPackageJson.scripts).toMatchObject({
      check: "cd .. && vitest run tests/docs-spec-consistency.test.ts",
    });
  });

  it("wires examples:test to a real examples validation test", () => {
    const examplesPackageJson = JSON.parse(readFileSync(rootPath("examples", "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(examplesPackageJson.scripts).toMatchObject({
      test: "cd .. && vitest run tests/examples-workspace-validation.test.ts",
    });
  });
});
