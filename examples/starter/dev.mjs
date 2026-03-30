import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeHost } from "@mdsnai/sdk/server";

import { createStarterServer } from "./dist/index.js";

const port = Number(process.env.PORT || 4322);
const exampleRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourcePath = join(exampleRoot, "pages", "guestbook.md");
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
  import { mountStarter } from "${withVersion("/starter/client.js")}";
  mountStarter(document, window.fetch.bind(window));
</script>`;

  return html.replace("</body>", `${enhancement}\n  </body>`);
}

const source = await readFile(sourcePath, "utf8");
const mdsn = createStarterServer({ source });
const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/starter/index.js": join(exampleRoot, "dist", "index.js"),
      "/starter/client.js": join(exampleRoot, "dist", "client.js")
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
  console.log(`Starter demo running at http://127.0.0.1:${port}/guestbook`);
});
