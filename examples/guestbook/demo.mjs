import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeHost } from "@mdsnai/sdk/server";

import { createGuestbookServer } from "./dist/index.js";

const port = Number(process.env.PORT || 4321);
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const guestbookPagePath = join(repoRoot, "examples", "guestbook", "pages", "guestbook.md");

const importMap = {
  imports: {
    "@mdsnai/sdk/core": "/sdk/dist/core/index.js",
    "@mdsnai/sdk/web": "/sdk/dist/web/index.js",
    "@mdsnai/sdk/elements": "/sdk/dist/elements/index.js",
    "lit": "/node_modules/lit/index.js",
    "lit-html": "/node_modules/lit-html/lit-html.js",
    "lit-html/is-server.js": "/node_modules/lit-html/is-server.js",
    "lit-element/lit-element.js": "/node_modules/lit-element/lit-element.js",
    "@lit/reactive-element": "/node_modules/@lit/reactive-element/reactive-element.js"
  }
};

function injectEnhancement(html) {
  const enhancement = `
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
  import { mountMdsnElements } from "@mdsnai/sdk/elements";
  import { createHeadlessHost } from "@mdsnai/sdk/web";

  const host = createHeadlessHost({ root: document, fetchImpl: window.fetch.bind(window) });
  mountMdsnElements({ root: document, host }).mount();
</script>`;

  return html.replace("</body>", `${enhancement}\n  </body>`);
}

const source = await readFile(guestbookPagePath, "utf8");
const mdsn = createGuestbookServer({ source });

const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
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
  console.log(`Guestbook demo running at http://127.0.0.1:${port}/guestbook`);
});
