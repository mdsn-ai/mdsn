import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

function loadRepoDoc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("docs spec consistency", () => {
  it("keeps the public action reference aligned with the runtime transport", () => {
    const actionReference = loadRepoDoc("docs/pages/zh/docs/action-reference.md");

    expect(actionReference).toContain("支持的文件扩展名");
    expect(actionReference).toContain("`.js`");
    expect(actionReference).toContain("`.mjs`");
    expect(actionReference).toContain("`.cjs`");
    expect(actionReference).toContain("页面里声明的 target");
    expect(actionReference).toContain("可直接调用的 HTTP 地址");
    expect(actionReference).toContain("在 HTTP Host 中");
    expect(actionReference).toContain("`read` 使用 `GET`");
    expect(actionReference).toContain("`write` 使用 `POST`");
    expect(actionReference).toContain("`Content-Type: text/markdown`");
    expect(actionReference).not.toContain('{ "inputs": { ... } }');
    expect(actionReference).not.toContain("`POST /__mdsn/actions/<actionId>`");
  });

  it("keeps the public docs source map pointed at the docs worktree", () => {
    const sources = loadRepoDoc("docs/CONTENT_SOURCES.md");

    expect(sources).toContain("Protocol draft pages remain internal until they are ready for public release.");
    expect(sources).toContain("Public docs are maintained in both English and Chinese.");
    expect(sources).toContain("`docs/pages/docs/server-development.md`");
    expect(sources).toContain("`docs/pages/zh/docs/server-development.md`");
    expect(sources).not.toContain("`docs/pages/zh/docs/spec.md`");
    expect(sources).not.toContain("`docs/pages/zh/docs/page-hosting-spec.md`");
    expect(sources).not.toContain("`docs/pages/zh/docs/grammar-ebnf.md`");
    expect(sources).not.toContain("`docs/pages/zh/docs/ast-design.md`");
  });

  it("keeps published zh docs discoverable from the docs index and sidebar", () => {
    const index = loadRepoDoc("docs/pages/zh/docs.md");
    const layout = loadRepoDoc("docs/layouts/docs.html");

    for (const route of [
      "/zh/docs/getting-started",
      "/zh/docs/site-development",
      "/zh/docs/routing-layouts",
      "/zh/docs/config-reference",
      "/zh/docs/action-reference",
      "/zh/docs/server-development",
      "/zh/docs/vue-rendering",
      "/zh/docs/react-rendering",
      "/zh/docs/shared-interaction",
      "/zh/docs/cli-reference",
      "/zh/docs/sdk-reference",
    ]) {
      expect(index.includes(route) || layout.includes(route)).toBe(true);
    }

    for (const route of [
      "/zh/docs/spec",
      "/zh/docs/page-hosting-spec",
      "/zh/docs/grammar-ebnf",
      "/zh/docs/ast-design",
    ]) {
      expect(index.includes(route) || layout.includes(route)).toBe(false);
    }
  });

  it("keeps published en docs discoverable from the docs index and sidebar", () => {
    const index = loadRepoDoc("docs/pages/docs.md");
    const layout = loadRepoDoc("docs/layouts/docs.html");

    for (const route of [
      "/docs/getting-started",
      "/docs/site-development",
      "/docs/routing-layouts",
      "/docs/config-reference",
      "/docs/action-reference",
      "/docs/server-development",
      "/docs/vue-rendering",
      "/docs/react-rendering",
      "/docs/shared-interaction",
      "/docs/cli-reference",
      "/docs/sdk-reference",
    ]) {
      expect(index.includes(route) || layout.includes(route)).toBe(true);
    }
  });

  it("describes framework build output as configuration-driven", () => {
    const frameworkGuide = loadRepoDoc("docs/pages/zh/docs/site-development.md");

    expect(frameworkGuide).toContain("遵循 `dirs.*` 配置");
    expect(frameworkGuide).toContain("只有存在且启用的目录才会被写入");
  });
});
