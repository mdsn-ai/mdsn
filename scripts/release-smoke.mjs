import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const cacheDir = "/tmp/mdsn-release-smoke-cache";
const defaultBunBin = process.env.HOME ? join(process.env.HOME, ".bun", "bin", "bun") : "bun";
const bunBin = process.env.BUN_BIN ?? (existsSync(defaultBunBin) ? defaultBunBin : "bun");

function toCompatibleSdkRange(packageVersion) {
  const match = String(packageVersion).match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) {
    throw new Error(`Unsupported package version: ${packageVersion}`);
  }
  return `^${match[1]}.${match[2]}.0`;
}

function withBunPath(env = {}) {
  if (!bunBin.includes("/")) {
    return { ...process.env, ...env };
  }

  const bunDir = dirname(bunBin);
  const nextPath = [bunDir, env.PATH, process.env.PATH].filter(Boolean).join(":");
  return {
    ...process.env,
    ...env,
    PATH: nextPath
  };
}

function parseArgs(argv) {
  const args = {};
  for (const entry of argv) {
    if (!entry.startsWith("--")) continue;
    const [key, value = "true"] = entry.slice(2).split("=");
    args[key] = value;
  }
  return args;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      const error = new Error(
        `${command} ${args.join(" ")} failed with exit code ${code}\n${stdout}\n${stderr}`.trim()
      );
      error.stdout = stdout;
      error.stderr = stderr;
      rejectPromise(error);
    });
  });
}

async function packWorkspace(workdir) {
  const { stdout } = await run("npm", ["pack", "--json", "--cache", cacheDir], { cwd: workdir });
  const result = JSON.parse(stdout);
  const filename = result[0]?.filename;
  if (!filename) {
    throw new Error(`Unable to determine tarball filename for ${workdir}`);
  }
  return join(workdir, filename);
}

async function reservePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();
    server.on("error", rejectPromise);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        rejectPromise(new Error("Unable to reserve port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise(port);
      });
    });
  });
}

async function waitForHttp(url, attempts = 50) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html"
        }
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function startApp(cwd, port) {
  const child = spawn("npm", ["start"], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return {
    child,
    output() {
      return { stdout, stderr };
    }
  };
}

function startAppForRuntime(cwd, port, runtime) {
  if (runtime === "bun") {
    const child = spawn(bunBin, ["run", "start"], {
      cwd,
      env: withBunPath({ PORT: String(port) }),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    return {
      child,
      output() {
        return { stdout, stderr };
      }
    };
  }

  return startApp(cwd, port);
}

async function stopApp(handle) {
  if (!handle || handle.child.exitCode !== null) return;
  handle.child.kill("SIGTERM");
  await new Promise((resolvePromise) => {
    handle.child.once("close", () => resolvePromise());
    setTimeout(() => resolvePromise(), 2000);
  });
}

async function rewriteSdkDependency(projectDir, spec) {
  const packageJsonPath = join(projectDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.dependencies["@mdsnai/sdk"] = spec;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function createProject({ mode, runtime, tempRoot, createVersion, sdkTarball }) {
  const cwd = join(tempRoot, "workspace");
  await mkdir(cwd, { recursive: true });

  if (mode === "prepublish") {
    const cliPath = join(repoRoot, "create-mdsn", "dist", "cli-bin.js");
    if (runtime === "bun") {
      await run(bunBin, ["run", cliPath, "agent-app", "--runtime", "bun"], { cwd });
    } else {
      await run("node", [cliPath, "agent-app", "--runtime", "node"], { cwd });
    }
    await rewriteSdkDependency(join(cwd, "agent-app"), sdkTarball);
    return join(cwd, "agent-app");
  }

  if (runtime === "bun") {
    await run(bunBin, ["x", `create-mdsn@${createVersion}`, "agent-app"], { cwd });
    return join(cwd, "agent-app");
  }

  await run("npm", ["create", `mdsn@${createVersion}`, "agent-app"], {
    cwd,
    env: { npm_config_cache: cacheDir }
  });
  return join(cwd, "agent-app");
}

async function assertFlow(projectDir, expectedSdkSpec, runtime) {
  const packageJson = JSON.parse(await readFile(join(projectDir, "package.json"), "utf8"));
  if (packageJson.dependencies?.["@mdsnai/sdk"] !== expectedSdkSpec) {
    throw new Error(
      `Expected @mdsnai/sdk dependency ${expectedSdkSpec}, received ${packageJson.dependencies?.["@mdsnai/sdk"]}`
    );
  }

  if (runtime === "bun") {
    await run(bunBin, ["install"], { cwd: projectDir });
  } else {
    await run("npm", ["install", "--cache", cacheDir], { cwd: projectDir });
  }

  const port = await reservePort();
  const app = startAppForRuntime(projectDir, port, runtime);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForHttp(`${baseUrl}/`);

    const htmlResponse = await fetch(`${baseUrl}/`, {
      headers: { Accept: "text/html" }
    });
    const html = await htmlResponse.text();
    if (!htmlResponse.ok || !html.includes("Agent App")) {
      throw new Error(`HTML flow failed\n${html}`);
    }

    const markdownResponse = await fetch(`${baseUrl}/`, {
      headers: { Accept: "text/markdown" }
    });
    const markdown = await markdownResponse.text();
    if (!markdownResponse.ok || !markdown.includes("Welcome to MDSN")) {
      throw new Error(`Markdown page flow failed\n${markdown}`);
    }

    const fragmentResponse = await fetch(`${baseUrl}/list`, {
      headers: { Accept: "text/markdown" }
    });
    const fragment = await fragmentResponse.text();
    if (!fragmentResponse.ok || !fragment.includes("## 1 live message")) {
      throw new Error(`Markdown fragment flow failed\n${fragment}`);
    }

    const writeResponse = await fetch(`${baseUrl}/post`, {
      method: "POST",
      headers: {
        Accept: "text/markdown",
        "Content-Type": "text/markdown"
      },
      body: 'message: "Hello from release smoke"'
    });
    const writeResult = await writeResponse.text();
    if (!writeResponse.ok || !writeResult.includes("Hello from release smoke")) {
      throw new Error(`Markdown write flow failed\n${writeResult}`);
    }

    const nextMarkdown = await (
      await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/markdown" }
      })
    ).text();
    if (!nextMarkdown.includes("## 2 live messages") || !nextMarkdown.includes("Hello from release smoke")) {
      throw new Error(`Updated markdown page missing expected content\n${nextMarkdown}`);
    }

    const nextHtml = await (
      await fetch(`${baseUrl}/`, {
        headers: { Accept: "text/html" }
      })
    ).text();
    if (!nextHtml.includes("2 live messages") || !nextHtml.includes("Hello from release smoke")) {
      throw new Error(`Updated HTML page missing expected content\n${nextHtml}`);
    }
  } catch (error) {
    const { stdout, stderr } = app.output();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n--- app stdout ---\n${stdout}\n--- app stderr ---\n${stderr}`.trim());
  } finally {
    await stopApp(app);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode ?? "prepublish";
  const runtime = args.runtime ?? "node";
  if (mode !== "prepublish" && mode !== "postpublish") {
    throw new Error(`Unsupported mode: ${mode}`);
  }
  if (runtime !== "node" && runtime !== "bun") {
    throw new Error(`Unsupported runtime: ${runtime}`);
  }

  const tempRoot = await mkdtemp(join(tmpdir(), `mdsn-release-smoke-${mode}-`));

  try {
    if (mode === "prepublish") {
      if (runtime === "bun") {
        await run(bunBin, ["run", "build"], { cwd: repoRoot });
      } else {
        await run("npm", ["run", "build"], { cwd: repoRoot });
      }
      const sdkTarball = await packWorkspace(join(repoRoot, "sdk"));
      const projectDir = await createProject({
        mode,
        runtime,
        tempRoot,
        sdkTarball
      });
      await assertFlow(projectDir, sdkTarball, runtime);
      console.log(`release smoke (${mode}, ${runtime}) passed`);
      return;
    }

    const createVersion = args["create-version"] ?? "latest";
    const sdkVersion = args["sdk-version"] ?? "latest";
    const projectDir = await createProject({
      mode,
      runtime,
      tempRoot,
      createVersion
    });
    await assertFlow(projectDir, toCompatibleSdkRange(createVersion), runtime);
    console.log(`release smoke (${mode}, ${runtime}) passed`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
