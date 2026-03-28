import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import * as sdk from "../sdk/src";
import * as core from "../sdk/src/core";
import * as web from "../sdk/src/web";
import * as server from "../sdk/src/server";
import * as framework from "../sdk/src/framework";
import * as cli from "../sdk/src/cli";

describe("sdk layered exports", () => {
  it("exposes only the stable developer-facing APIs from the sdk root entry", () => {
    expect(typeof sdk.parsePageDefinition).toBe("function");
    expect(typeof sdk.renderPageHtml).toBe("function");
    expect(typeof sdk.createRenderModel).toBe("function");
    expect(typeof sdk.renderDefaultHtmlDocument).toBe("function");
    expect(typeof sdk.getClientRuntimeScript).toBe("function");
    expect(typeof sdk.createFrameworkApp).toBe("function");
    expect(typeof sdk.defineConfig).toBe("function");
    expect(typeof sdk.defineAction).toBe("function");
    expect("createParallelSiteApp" in sdk).toBe(false);
    expect("foundation" in sdk).toBe(false);
    expect("parseMdsnBlocks" in sdk).toBe(false);
    expect("buildExecutionDefinition" in sdk).toBe(false);
    expect("applyLayoutTemplate" in sdk).toBe(false);
    expect("resolveLocaleForRoutePath" in sdk).toBe(false);
    expect("runCli" in sdk).toBe(false);
  });

  it("keeps each canonical layer importable with a narrow surface", () => {
    expect(typeof core.parsePageDefinition).toBe("function");
    expect("parseMdsnBlocks" in core).toBe(false);
    expect("buildExecutionDefinition" in core).toBe(false);
    expect(typeof web.createRenderModel).toBe("function");
    expect(typeof web.parseMarkdown).toBe("function");
    expect(typeof web.parsePage).toBe("function");
    expect(typeof web.parseFragment).toBe("function");
    expect(typeof web.renderDefaultHtmlDocument).toBe("function");
    expect(typeof web.getClientRuntimeScript).toBe("function");
    expect(typeof server.defineAction).toBe("function");
    expect(typeof server.renderMarkdownValue).toBe("function");
    expect(typeof server.serializeBlock).toBe("function");
    expect(typeof server.renderMarkdownFragment).toBe("function");
    expect(typeof server.renderErrorFragment).toBe("function");
    expect(typeof server.renderActionNotAvailableFragment).toBe("function");
    expect(typeof server.renderUnsupportedContentTypeFragment).toBe("function");
    expect(typeof server.renderInternalErrorFragment).toBe("function");
    expect(typeof server.wantsHtml).toBe("function");
    expect(typeof framework.createFrameworkApp).toBe("function");
    expect(typeof framework.defineConfig).toBe("function");
    expect("createParallelFrameworkApp" in framework).toBe(false);
    expect("createParallelSiteApp" in framework).toBe(false);
    expect("defineAction" in framework).toBe(false);
    expect("wantsHtml" in framework).toBe(false);
    expect("createFrameworkRuntime" in framework).toBe(false);
    expect("resolveConfig" in framework).toBe(false);
    expect("applyLayoutTemplate" in framework).toBe(false);
    expect("resolveLocaleForRoutePath" in framework).toBe(false);
    expect(typeof cli.runCli).toBe("function");
  });

  it("resolves workspace package exports for root and canonical layer entry points", () => {
    const distEntry = path.join(process.cwd(), "sdk", "dist", "index.js");

    if (!existsSync(distEntry)) {
      execFileSync("npm", ["run", "build", "--workspace", "@mdsnai/sdk"], {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    }

    const output = execFileSync(
      process.execPath,
      [
        "-e",
        `Promise.all([import("@mdsnai/sdk"), import("@mdsnai/sdk/core"), import("@mdsnai/sdk/web"), import("@mdsnai/sdk/server"), import("@mdsnai/sdk/framework"), import("@mdsnai/sdk/cli")]).then(([root, coreLayer, webLayer, serverLayer, frameworkLayer, cliLayer]) => { console.log(JSON.stringify({ root: typeof root.parsePageDefinition, rootFramework: typeof root.createFrameworkApp, core: typeof coreLayer.parsePageDefinition, web: typeof webLayer.getClientRuntimeScript, server: typeof serverLayer.defineAction, framework: typeof frameworkLayer.createFrameworkApp, cli: typeof cliLayer.runCli })); }).catch((error) => { console.error(error); process.exit(1); });`,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(JSON.parse(output)).toEqual({
      root: "function",
      rootFramework: "function",
      core: "function",
      web: "function",
      server: "function",
      framework: "function",
      cli: "function",
    });
  });
});
