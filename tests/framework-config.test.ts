import { describe, expect, it } from "vitest";
import { defineConfig } from "../sdk/src/framework";
import { resolveConfig } from "../sdk/src/server/config";

describe("framework config", () => {
  it("fills default directories and server options", () => {
    const config = resolveConfig(defineConfig({}));

    expect(config.dirs.pages).toBe("pages");
    expect(config.dirs.server).toBe("server");
    expect(config.dirs.public).toBe("public");
    expect(config.dirs.layouts).toBe("layouts");
    expect(config.server.port).toBe(3000);
    expect(config.markdown.linkify).toBe(true);
    expect(config.markdown.typographer).toBe(false);
    expect(config.dev.openBrowser).toBe(true);
    expect(config.i18n.defaultLocale).toBe("en");
    expect(config.i18n.locales).toEqual(["en"]);
  });

  it("preserves explicit directory overrides", () => {
    const config = resolveConfig(defineConfig({
      dirs: {
        pages: "content",
        server: "functions",
      },
      server: {
        port: 4321,
      },
    }));

    expect(config.dirs.pages).toBe("content");
    expect(config.dirs.server).toBe("functions");
    expect(config.server.port).toBe(4321);
  });

  it("returns the original config from defineConfig", () => {
    const config = defineConfig({
      site: {
        title: "hello",
      },
    });

    expect(config).toEqual({
      site: {
        title: "hello",
      },
    });
  });

  it("preserves explicit i18n overrides", () => {
    const config = resolveConfig(defineConfig({
      i18n: {
        defaultLocale: "zh",
        locales: ["en", "zh"],
      },
    }));

    expect(config.i18n.defaultLocale).toBe("zh");
    expect(config.i18n.locales).toEqual(["en", "zh"]);
  });
});
