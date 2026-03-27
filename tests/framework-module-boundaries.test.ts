import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function rootPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

describe("framework module boundaries", () => {
  it("keeps create-framework-app.ts as the thin public wrapper over the new site app", () => {
    const appSource = readFileSync(rootPath("sdk", "src", "framework", "create-framework-app.ts"), "utf8");

    expect(appSource).toContain('from "./site-app"');
    expect(appSource).toContain("createSiteApp");

    expect(appSource).not.toContain("express()");
    expect(appSource).not.toContain("app.get(");
    expect(appSource).not.toContain("app.post(");
  });
});
