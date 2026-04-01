import { Marked, Parser } from "marked";

export interface TocItem {
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

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/[^\w\u4e00-\u9fa5 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "section";
}

function uniqueSlug(slug: string, counts: Map<string, number>): string {
  const count = counts.get(slug) ?? 0;
  counts.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

function renderInlineText(parser: Marked, markdown: string): string {
  const rendered = parser.parseInline(markdown);
  if (typeof rendered !== "string") {
    throw new TypeError("Expected synchronous inline markdown rendering.");
  }
  return stripHtmlTags(rendered);
}

function collectHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const counts = new Map<string, number>();
  const parser = new Marked({
    gfm: true,
    async: false
  });

  for (const token of parser.lexer(markdown)) {
    if (token.type !== "heading") {
      continue;
    }
    const depth = token.depth as 1 | 2 | 3 | 4 | 5 | 6;
    if (depth !== 2 && depth !== 3) {
      continue;
    }
    const text = renderInlineText(parser, token.text).trim();
    const id = uniqueSlug(slugify(text), counts);
    items.push({ depth, id, text });
  }

  return items;
}

export function extractToc(markdown: string): TocItem[] {
  return collectHeadings(markdown);
}

export function injectHeadingIds(html: string, toc: TocItem[]): string {
  const queue = [...toc];
  return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (full, depth, attrs, content) => {
    const next = queue.shift();
    if (!next || Number(depth) !== next.depth) {
      return full;
    }
    if (/\sid\s*=/.test(attrs)) {
      return full;
    }
    return `<h${depth}${attrs} id="${escapeHtml(next.id)}">${content}</h${depth}>`;
  });
}

export function renderDocsMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const toc = collectHeadings(markdown);
  const idQueue = toc.map((item) => item.id);
  const parser = new Marked({
    gfm: true,
    async: false
  });

  parser.use({
    renderer: {
      heading: ({ depth, text, tokens }) => {
        if (depth < 1 || depth > 6) {
          return `<p>${escapeHtml(text)}</p>`;
        }
        const id = depth === 2 || depth === 3 ? idQueue.shift() : undefined;
        const attrs = id ? ` id="${escapeHtml(id)}"` : "";
        const inner = tokens ? Parser.parseInline(tokens) : parser.parseInline(text);
        return `<h${depth}${attrs}>${inner}</h${depth}>`;
      }
    }
  });

  return {
    html: parser.parse(markdown) as string,
    toc
  };
}
