import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeHost } from "@mdsnai/sdk/server";

import { createAuthServer } from "./dist/index.js";

const port = Number(process.env.PORT || 4323);
const exampleRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const loginSourcePath = join(exampleRoot, "pages", "login.md");
const registerSourcePath = join(exampleRoot, "pages", "register.md");
const vaultSourcePath = join(exampleRoot, "pages", "vault.md");
const assetVersion = Date.now().toString(36);

function withVersion(path) {
  return `${path}?v=${assetVersion}`;
}

const importMap = {
  imports: {
    "@mdsnai/sdk/core": withVersion("/sdk/dist/core/index.js"),
    "@mdsnai/sdk/web": withVersion("/sdk/dist/web/index.js"),
    "@mdsnai/sdk/elements": withVersion("/sdk/dist/elements/index.js"),
    "lit": withVersion("/node_modules/lit/index.js"),
    "lit-html": withVersion("/node_modules/lit-html/lit-html.js"),
    "lit-html/is-server.js": withVersion("/node_modules/lit-html/is-server.js"),
    "lit-element/lit-element.js": withVersion("/node_modules/lit-element/lit-element.js"),
    "@lit/reactive-element": withVersion("/node_modules/@lit/reactive-element/reactive-element.js")
  }
};

function injectEnhancement(html) {
  const enhancement = `
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
  import { mountAuthSessionExample } from "${withVersion("/auth-session/client.js")}";
  mountAuthSessionExample(document, window.fetch.bind(window));
</script>`;

  return html.replace("</body>", `${enhancement}\n  </body>`);
}

const [loginSource, registerSource, vaultSource] = await Promise.all([
  readFile(loginSourcePath, "utf8"),
  readFile(registerSourcePath, "utf8"),
  readFile(vaultSourcePath, "utf8")
]);
const mdsn = createAuthServer({ loginSource, registerSource, vaultSource });

const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/login",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/auth-session/index.js": join(exampleRoot, "dist", "index.js"),
      "/auth-session/client.js": join(exampleRoot, "dist", "client.js")
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
  console.log(`Auth session demo running at http://127.0.0.1:${port}/login`);
});
