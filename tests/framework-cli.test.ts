import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Express } from "express";
import { runCli, parseCliArgs } from "../sdk/src/cli";
import { runBuild } from "../sdk/src/cli/commands/build";
import { runDev } from "../sdk/src/cli/commands/dev";
import { runStart } from "../sdk/src/cli/commands/start";

const rootsToCleanup: string[] = [];

function createMockApp(): Express {
  return {
    listen: vi.fn(),
  } as unknown as Express;
}

afterEach(() => {
  vi.restoreAllMocks();

  for (const rootDir of rootsToCleanup.splice(0, rootsToCleanup.length)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

describe("framework cli", () => {
  it("dispatches the create command", async () => {
    const create = vi.fn(async () => {});

    await runCli(["create", "demo-site"], { create });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(["demo-site"]);
  });

  it("dispatches the dev command", async () => {
    const dev = vi.fn(async () => {});

    await runCli(["dev"], { dev });

    expect(dev).toHaveBeenCalledTimes(1);
  });

  it("dispatches the build command", async () => {
    const build = vi.fn(async () => {});

    await runCli(["build"], { build });

    expect(build).toHaveBeenCalledTimes(1);
  });

  it("dispatches the start command", async () => {
    const start = vi.fn(async () => {});

    await runCli(["start"], { start });

    expect(start).toHaveBeenCalledTimes(1);
  });

  it("throws for unknown commands", async () => {
    await expect(runCli(["wat"])).rejects.toThrow(
      "Unknown command: wat. Expected one of: create, dev, build, start",
    );
  });
});

describe("framework cli option parsing", () => {
  it("parses --cwd and --port long options", () => {
    expect(parseCliArgs(["--cwd", "./site", "--port", "3020"], { allowPort: true })).toEqual({
      cwd: "./site",
      port: 3020,
      positional: [],
    });
  });

  it("parses -C and -p short options", () => {
    expect(parseCliArgs(["-C", "demo", "-p", "3030"], { allowPort: true })).toEqual({
      cwd: "demo",
      port: 3030,
      positional: [],
    });
  });

  it("throws on unknown options", () => {
    expect(() => parseCliArgs(["--unknown"], { allowPort: false })).toThrow("Unknown option: --unknown");
  });

  it("throws when --port is not allowed", () => {
    expect(() => parseCliArgs(["--port", "3030"], { allowPort: false })).toThrow(
      "Option --port is only supported by dev/start",
    );
  });

  it("throws on invalid port values", () => {
    expect(() => parseCliArgs(["--port", "abc"], { allowPort: true })).toThrow(
      "Invalid value for --port: abc",
    );
  });
});

describe("framework dev and start commands", () => {
  it("loads cjs config files for build/runtime commands", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-cjs-config-"));
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = { site: { title: "CJS Site" }, server: { port: 4311 } };`,
      "utf8",
    );
    writeFileSync(path.join(rootDir, "pages", "index.md"), "# Home\n", "utf8");

    await runBuild({
      cwd: rootDir,
      log: () => undefined,
    });

    expect(JSON.parse(readFileSync(path.join(rootDir, "dist", "mdsn.config.json"), "utf8"))).toMatchObject({
      site: {
        title: "CJS Site",
      },
      server: {
        port: 4311,
      },
    });
  });

  it("loads config and starts the dev server on the configured port", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-dev-"));
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "mdsn.config.ts"),
      `export default { server: { port: 4123 } };`,
      "utf8",
    );

    const app = createMockApp();
    const createApp = vi.fn(() => app);
    const listen = vi.fn(async () => {});

    await runDev({
      cwd: rootDir,
      createApp,
      listen,
      log: () => undefined,
    });

    expect(createApp).toHaveBeenCalledWith({
      rootDir,
      mode: "dev",
      config: {
        server: {
          port: 4123,
        },
      },
      devState: expect.any(Object),
    });
    expect(listen).toHaveBeenCalledWith({
      app,
      port: 4123,
      log: expect.any(Function),
    });
  });

  it("overrides the configured dev port when explicit port option is provided", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-dev-port-"));
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "mdsn.config.ts"),
      `export default { server: { port: 4123 } };`,
      "utf8",
    );

    const app = createMockApp();
    const createApp = vi.fn(() => app);
    const listen = vi.fn(async () => {});

    await runDev({
      cwd: rootDir,
      port: 4222,
      createApp,
      listen,
      log: () => undefined,
    });

    expect(listen).toHaveBeenCalledWith({
      app,
      port: 4222,
      log: expect.any(Function),
    });
  });

  it("loads config and starts the production server on the configured port", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-start-"));
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "mdsn.config.ts"),
      `export default { server: { port: 5123 } };`,
      "utf8",
    );

    const app = createMockApp();
    const createApp = vi.fn(() => app);
    const listen = vi.fn(async () => {});

    await runStart({
      cwd: rootDir,
      createApp,
      listen,
      log: () => undefined,
    });

    expect(createApp).toHaveBeenCalledWith({
      rootDir,
      mode: "start",
      config: {
        server: {
          port: 5123,
        },
      },
    });
    expect(listen).toHaveBeenCalledWith({
      app,
      port: 5123,
      log: expect.any(Function),
    });
  });

  it("overrides the configured start port when explicit port option is provided", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-start-port-"));
    rootsToCleanup.push(rootDir);

    writeFileSync(
      path.join(rootDir, "mdsn.config.ts"),
      `export default { server: { port: 5123 } };`,
      "utf8",
    );

    const app = createMockApp();
    const createApp = vi.fn(() => app);
    const listen = vi.fn(async () => {});

    await runStart({
      cwd: rootDir,
      port: 5222,
      createApp,
      listen,
      log: () => undefined,
    });

    expect(listen).toHaveBeenCalledWith({
      app,
      port: 5222,
      log: expect.any(Function),
    });
  });

  it("prefers built dist output when starting in production mode", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-start-dist-"));
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "dist", "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "dist", "server"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "dist", "mdsn.config.json"),
      JSON.stringify({
        site: {},
        server: { port: 6123 },
        dirs: {
          pages: "pages",
          server: "server",
          public: "public",
          layouts: "layouts",
        },
        markdown: {
          linkify: true,
          typographer: false,
        },
        dev: {
          openBrowser: true,
        },
      }),
      "utf8",
    );

    const app = createMockApp();
    const createApp = vi.fn(() => app);
    const listen = vi.fn(async () => {});

    await runStart({
      cwd: rootDir,
      createApp,
      listen,
      log: () => undefined,
    });

    expect(createApp).toHaveBeenCalledWith({
      rootDir: path.join(rootDir, "dist"),
      mode: "start",
      config: {
        site: {},
        server: { port: 6123 },
        dirs: {
          pages: "pages",
          server: "server",
          public: "public",
          layouts: "layouts",
        },
        markdown: {
          linkify: true,
          typographer: false,
        },
        dev: {
          openBrowser: true,
        },
      },
    });
    expect(listen).toHaveBeenCalledWith({
      app,
      port: 6123,
      log: expect.any(Function),
    });
  });

  it("builds minimal page and action manifests into dist", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-build-"));
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages", "blog"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });
    mkdirSync(path.join(rootDir, "public", "images"), { recursive: true });
    mkdirSync(path.join(rootDir, "layouts"), { recursive: true });
    writeFileSync(path.join(rootDir, "mdsn.config.ts"), `export default {};`, "utf8");
    writeFileSync(path.join(rootDir, "pages", "index.md"), "# Home\n", "utf8");
    writeFileSync(path.join(rootDir, "pages", "blog", "[slug].md"), "# Post\n", "utf8");
    writeFileSync(
      path.join(rootDir, "server", "hello.cjs"),
      `module.exports = { async run() { return "# hi"; } };`,
      "utf8",
    );
    writeFileSync(path.join(rootDir, "public", "images", "logo.txt"), "logo", "utf8");
    writeFileSync(path.join(rootDir, "layouts", "default.html"), "<main>{{content}}</main>", "utf8");
    mkdirSync(path.join(rootDir, "dist", "public"), { recursive: true });
    writeFileSync(path.join(rootDir, "dist", "public", "stale.txt"), "stale", "utf8");

    await runBuild({
      cwd: rootDir,
      log: () => undefined,
    });

    expect(existsSync(path.join(rootDir, "dist", "manifest", "pages.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "manifest", "actions.json"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "public", "images", "logo.txt"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "pages", "index.md"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "pages", "blog", "[slug].md"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "server", "hello.cjs"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "layouts", "default.html"))).toBe(true);
    expect(existsSync(path.join(rootDir, "dist", "public", "stale.txt"))).toBe(false);
    expect(existsSync(path.join(rootDir, "dist", "mdsn.config.json"))).toBe(true);
    expect(readFileSync(path.join(rootDir, "dist", "public", "images", "logo.txt"), "utf8")).toBe("logo");
    expect(JSON.parse(readFileSync(path.join(rootDir, "dist", "mdsn.config.json"), "utf8"))).toEqual({
      site: {},
      server: {
        port: 3000,
      },
      dirs: {
        pages: "pages",
        server: "server",
        public: "public",
        layouts: "layouts",
      },
      markdown: {
        linkify: true,
        typographer: false,
      },
      dev: {
        openBrowser: true,
      },
      i18n: {
        defaultLocale: "en",
        locales: ["en"],
      },
    });

    expect(JSON.parse(readFileSync(path.join(rootDir, "dist", "manifest", "pages.json"), "utf8"))).toEqual([
      { file: "index.md", routePath: "/" },
      { file: "blog/[slug].md", routePath: "/blog/[slug]" },
    ]);

    expect(JSON.parse(readFileSync(path.join(rootDir, "dist", "manifest", "actions.json"), "utf8"))).toEqual([
      { id: "hello", file: "hello.cjs" },
    ]);
  });

  it("builds custom public directories into matching dist paths", async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "mdsn-cli-build-custom-public-"));
    rootsToCleanup.push(rootDir);

    mkdirSync(path.join(rootDir, "pages"), { recursive: true });
    mkdirSync(path.join(rootDir, "server"), { recursive: true });
    mkdirSync(path.join(rootDir, "assets", "images"), { recursive: true });
    writeFileSync(
      path.join(rootDir, "mdsn.config.cjs"),
      `module.exports = {
  dirs: {
    public: "assets",
  },
};`,
      "utf8",
    );
    writeFileSync(path.join(rootDir, "pages", "index.md"), "# Home\n", "utf8");
    writeFileSync(path.join(rootDir, "assets", "images", "logo.txt"), "logo", "utf8");

    await runBuild({
      cwd: rootDir,
      log: () => undefined,
    });

    expect(existsSync(path.join(rootDir, "dist", "assets", "images", "logo.txt"))).toBe(true);
    expect(readFileSync(path.join(rootDir, "dist", "assets", "images", "logo.txt"), "utf8")).toBe("logo");
  });
});
