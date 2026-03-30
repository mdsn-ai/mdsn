import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { createNodeHost } from "@mdsnai/sdk/server";

import { createReactStarterServer } from "./dist/index.js";

const port = Number(process.env.PORT || 4325);
const exampleRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourcePath = join(exampleRoot, "pages", "guestbook.md");
const assetVersion = Date.now().toString(36);
const browserClientPath = join(exampleRoot, "dist", "client.browser.js");

function withVersion(path) {
  return `${path}?v=${assetVersion}`;
}

function injectEnhancement(html) {
  const shell = `
<div id="react-starter-root"></div>
<style>
  mdsn-page {
    display: none !important;
  }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top, rgba(45, 212, 191, 0.14), transparent 38%),
      linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
    padding: 0;
  }
  #react-starter-root {
    min-height: 100vh;
  }
  .framework-shell {
    max-width: 880px;
    margin: 0 auto;
    padding: 36px 18px 54px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #1f2937;
  }
  .framework-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    margin-bottom: 18px;
  }
  .framework-pill {
    border-radius: 999px;
    padding: 10px 14px;
    background: rgba(15, 23, 42, 0.92);
    color: white;
    font-size: 0.85rem;
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.2);
  }
  .framework-error {
    max-width: 280px;
    border-radius: 14px;
    padding: 10px 12px;
    background: rgba(127, 29, 29, 0.92);
    color: white;
    font: 0.82rem/1.4 ui-sans-serif, system-ui, sans-serif;
  }
  .framework-page {
    display: grid;
    gap: 20px;
  }
  .framework-title {
    margin: 0 0 10px;
    font-size: clamp(3rem, 8vw, 5rem);
    line-height: 0.9;
    letter-spacing: -0.06em;
    color: #0f172a;
  }
  .framework-copy {
    margin: 0;
    color: #334155;
    font-size: 1.15rem;
    line-height: 1.7;
  }
  .framework-block {
    padding: 26px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.22);
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
  }
  .framework-block-title {
    margin: 0 0 12px;
    font-size: 0.98rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #0f766e;
  }
  .framework-list {
    list-style: none;
    padding: 0;
    margin: 16px 0 0;
    display: grid;
    gap: 12px;
  }
  .framework-list li {
    position: relative;
    padding: 16px 18px 16px 48px;
    border-radius: 18px;
    background: rgba(248, 250, 252, 0.96);
    border: 1px solid #dbe3ef;
  }
  .framework-list li::before {
    content: "";
    position: absolute;
    left: 18px;
    top: 18px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: linear-gradient(180deg, #2dd4bf 0%, #0f766e 100%);
    box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.12);
  }
  .framework-actions,
  .framework-form {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }
  .framework-actions {
    grid-auto-flow: column;
    justify-content: start;
  }
  .framework-field {
    display: grid;
    gap: 8px;
  }
  .framework-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #475569;
  }
  .framework-required {
    color: #dc2626;
    font-size: 1rem;
  }
  .framework-field input,
  .framework-field select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(148, 163, 184, 0.32);
    border-radius: 18px;
    padding: 14px 16px;
    font: inherit;
    background: rgba(255, 255, 255, 0.94);
  }
  .framework-button {
    width: fit-content;
    border: 0;
    border-radius: 999px;
    padding: 12px 20px;
    font: inherit;
    font-weight: 800;
    color: white;
    background: linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
    box-shadow: 0 16px 28px rgba(15, 118, 110, 0.2);
    cursor: pointer;
  }
  .framework-button-secondary {
    color: #0f766e;
    background: rgba(240, 253, 250, 0.92);
    border: 1px solid rgba(15, 118, 110, 0.18);
    box-shadow: none;
  }
</style>
<script type="module">
  import { mountReactStarter } from "${withVersion("/react-starter/client.browser.js")}";
  const host = document.getElementById("react-starter-root");
  if (host) {
    mountReactStarter(host);
  }
</script>`;

  return html.replace("</body>", `${shell}\n  </body>`);
}

await build({
  entryPoints: [join(exampleRoot, "src", "client.tsx")],
  outfile: browserClientPath,
  bundle: true,
  format: "esm",
  platform: "browser",
  sourcemap: true
});

const source = await readFile(sourcePath, "utf8");
const mdsn = createReactStarterServer({ source });
const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/react-starter/index.js": join(exampleRoot, "dist", "index.js"),
      "/react-starter/client.js": join(exampleRoot, "dist", "client.js"),
      "/react-starter/client.browser.js": browserClientPath
    },
    staticMounts: [
      {
        urlPrefix: "/sdk/",
        directory: join(repoRoot, "sdk")
      },
      {
        urlPrefix: "/node_modules/",
        directory: join(repoRoot, "node_modules")
      }
    ]
  })
);

server.listen(port, "127.0.0.1", () => {
  console.log(`React starter demo running at http://127.0.0.1:${port}/guestbook`);
});
