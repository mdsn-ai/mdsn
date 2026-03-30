import { createHostedApp } from "@mdsnai/sdk/server";
import { composePage } from "@mdsnai/sdk/core";
import type { MdsnFrontmatter, MdsnMarkdownRenderer } from "@mdsnai/sdk/core";

export interface CreateDocsSiteServerOptions {
  pages: Record<string, string>;
  markdownRenderer?: MdsnMarkdownRenderer;
}

interface DocsPageRecord {
  route: string;
  page: ReturnType<typeof composePage>;
}

interface TocItem {
  depth: 2 | 3;
  id: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/[^\w\u4e00-\u9fa5 -]/g, "")
    .replace(/\s+/g, "-");
  return normalized || "section";
}

function renderInline(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderDocsMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const lines = markdown.split("\n");
  const html: string[] = [];
  const toc: TocItem[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const depth = headingMatch[1]!.length as 1 | 2 | 3;
      const text = headingMatch[2]!.trim();
      const id = slugify(text);
      html.push(`<h${depth} id="${escapeHtml(id)}">${renderInline(text)}</h${depth}>`);
      if (depth === 2 || depth === 3) {
        toc.push({ depth, id, text });
      }
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length) {
        const candidate = lines[index] ?? "";
        if (candidate.trim() === "```") {
          break;
        }
        codeLines.push(candidate);
        index += 1;
      }
      const code = escapeHtml(codeLines.join("\n"));
      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(`<pre><code${languageClass}>${code}</code></pre>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = (lines[index] ?? "").trim();
        if (!itemLine.startsWith("- ")) {
          break;
        }
        items.push(`<li>${renderInline(itemLine.slice(2).trim())}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = (lines[index] ?? "").trim();
      if (!candidate || /^(#{1,3})\s+/.test(candidate) || candidate.startsWith("- ") || candidate.startsWith("```")) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }
    html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return {
    html: html.join("\n"),
    toc
  };
}

function toTitle(frontmatter: MdsnFrontmatter, route: string): string {
  const title = frontmatter.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }
  return route === "/docs" ? "Docs" : route.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Docs";
}

function sortByRoute(records: DocsPageRecord[]): DocsPageRecord[] {
  return [...records].sort((a, b) => {
    if (a.route === "/docs") {
      return -1;
    }
    if (b.route === "/docs") {
      return 1;
    }
    return a.route.localeCompare(b.route);
  });
}

function createNavigation(records: DocsPageRecord[], currentRoute: string): string {
  return records
    .map(({ route, page }) => {
      const active = route === currentRoute ? ' aria-current="page"' : "";
      return `<a href="${escapeHtml(route)}"${active}>${escapeHtml(toTitle(page.frontmatter, route))}</a>`;
    })
    .join("");
}

function renderToc(items: TocItem[]): string {
  if (items.length === 0) {
    return `<aside class="docs-toc docs-toc-empty"></aside>`;
  }
  const list = items
    .map((item) => `<li class="depth-${item.depth}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`)
    .join("");
  return `<aside class="docs-toc"><h2>On this page</h2><ul>${list}</ul></aside>`;
}

export function createDocsSiteServer(options: CreateDocsSiteServerOptions) {
  const markdownRenderer = options.markdownRenderer;
  const records = sortByRoute(
    Object.entries(options.pages).map(([route, source]) => ({
      route,
      page: composePage(source)
    }))
  );
  const pageMap = new Map(records.map((record) => [record.route, record.page]));

  return createHostedApp({
    pages: Object.fromEntries(
      records.map(({ route }) => [
        route,
        () => {
          const page = pageMap.get(route);
          if (!page) {
            throw new Error(`Unknown docs route: ${route}`);
          }
          return page;
        }
      ])
    ),
    renderHtml(fragment, renderOptions) {
      const route = renderOptions?.route ?? "/docs";
      const page = pageMap.get(route);
      const title = page ? toTitle(page.frontmatter, route) : "Docs";
      const navigation = createNavigation(records, route);
      const rendered = markdownRenderer
        ? { html: markdownRenderer.render(fragment.markdown), toc: [] as TocItem[] }
        : renderDocsMarkdown(fragment.markdown);
      const toc = renderToc(rendered.toc);

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Docs</title>
    <link rel="stylesheet" href="/docs-site/site.css">
  </head>
  <body>
    <header class="docs-topbar">
      <a class="docs-brand" href="/docs">MDSN Docs</a>
    </header>
    <main class="docs-shell">
      <aside class="docs-nav">
        <h2>Pages</h2>
        <nav>${navigation}</nav>
      </aside>
      <article class="docs-content">
        ${rendered.html}
      </article>
      ${toc}
    </main>
  </body>
</html>`;
    }
  });
}
