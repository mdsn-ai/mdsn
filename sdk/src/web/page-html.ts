import type { PageRenderModel } from "./page-render";
import { escapeHtml } from "../core";

function serializeInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026");
}

export interface PageHtmlOptions {
  title?: string;
  lang?: string;
  clientScriptPath?: string;
}

export function renderPageHtmlContent(
  model: PageRenderModel,
  options?: Pick<PageHtmlOptions, "clientScriptPath">,
): string {
  const clientScriptPath = options?.clientScriptPath ?? "/__mdsn/client.js";

  return `<main>
      <article class="mdsn-content" data-mdsn-root>${model.markdownHtml}</article>
      <div data-mdsn-status hidden></div>
    </main>
    <script id="mdsn-bootstrap" type="application/json">${serializeInlineJson(model.bootstrap)}</script>
    <script src="${escapeHtml(clientScriptPath)}" defer></script>`;
}

export function renderPageHtmlDocument(
  model: PageRenderModel,
  options?: PageHtmlOptions,
): string {
  const title = typeof options?.title === "string" && options.title.trim().length > 0
    ? options.title
    : typeof model.document.frontmatter.title === "string" && model.document.frontmatter.title.trim().length > 0
      ? model.document.frontmatter.title
      : "MDSN Page";
  const lang = typeof options?.lang === "string" && options.lang.trim().length > 0
    ? options.lang
    : "en";
  const clientScriptPath = options?.clientScriptPath ?? "/__mdsn/client.js";

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    ${renderPageHtmlContent(model, { clientScriptPath })}
  </body>
</html>`;
}
