export interface MdsnMarkdownRenderer {
  render(markdown: string): string;
}

type RenderNode =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseRenderableMarkdown(markdown: string): RenderNode[] {
  const lines = markdown.split("\n");
  const visible: string[] = [];
  let inFrontmatter = false;
  let frontmatterHandled = false;
  let inCode = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!frontmatterHandled && trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) {
        frontmatterHandled = true;
      }
      continue;
    }
    if (inFrontmatter) {
      continue;
    }
    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode || trimmed.startsWith("<!-- mdsn:block")) {
      continue;
    }
    visible.push(line);
  }

  return visible
    .join("\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const rows = chunk.split("\n").map((row) => row.trim()).filter(Boolean);
      if (rows.every((row) => row.startsWith("- "))) {
        return {
          type: "ul" as const,
          items: rows.map((row) => row.slice(2).trim())
        };
      }
      if (chunk.startsWith("# ")) {
        return { type: "h1" as const, text: chunk.slice(2).trim() };
      }
      if (chunk.startsWith("## ")) {
        return { type: "h2" as const, text: chunk.slice(3).trim() };
      }
      return { type: "p" as const, text: rows.join(" ") };
    });
}

export const basicMarkdownRenderer: MdsnMarkdownRenderer = {
  render(markdown: string): string {
    return parseRenderableMarkdown(markdown)
      .map((node) => {
        if (node.type === "h1") {
          return `<h1>${escapeHtml(node.text)}</h1>`;
        }
        if (node.type === "h2") {
          return `<h2>${escapeHtml(node.text)}</h2>`;
        }
        if (node.type === "p") {
          return `<p>${escapeHtml(node.text)}</p>`;
        }
        return `<ul>${node.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      })
      .join("\n");
  }
};
