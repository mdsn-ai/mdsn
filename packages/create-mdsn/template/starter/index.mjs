import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeHost } from "@mdsn/server";

import { createAppServer } from "./dist/server.js";

const port = Number(process.env.PORT || 4322);
const projectRoot = fileURLToPath(new URL("./", import.meta.url));
const sourcePath = join(projectRoot, "app", "guestbook.md");
const assetVersion = Date.now().toString(36);

function withVersion(path) {
  return `${path}?v=${assetVersion}`;
}

const importMap = {
  imports: {
    "@mdsn/core": withVersion("/node_modules/@mdsn/core/dist/index.js"),
    "@mdsn/web": withVersion("/node_modules/@mdsn/web/dist/index.js"),
    "@mdsn/elements": withVersion("/node_modules/@mdsn/elements/dist/index.js"),
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
  import { mountApp } from "${withVersion("/app/client.js")}";
  mountApp(document, window.fetch.bind(window));
</script>`;

  return html.replace("</body>", `${enhancement}\n  </body>`);
}

const source = await readFile(sourcePath, "utf8");
const mdsn = createAppServer({ source });
const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/app/client.js": join(projectRoot, "dist", "client.js")
    },
    staticMounts: [
      {
        urlPrefix: "/node_modules/",
        directory: join(projectRoot, "node_modules")
      }
    ]
  })
);

server.listen(port, "127.0.0.1", () => {
  console.log(`MDSN starter running at http://127.0.0.1:${port}/guestbook`);
});
