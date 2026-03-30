import type { MdsnBlock, MdsnFragment, MdsnFrontmatter, MdsnInput, MdsnOperation, MdsnPage } from "./types.js";

const blockAnchorPattern = /^<!--\s*mdsn:block\s+([a-zA-Z_][\w-]*)\s*-->$/;

function serializeFrontmatter(frontmatter: MdsnFrontmatter): string {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) {
    return "";
  }

  const lines = entries.map(([key, value]) => `${key}: ${serializeScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function serializeScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function serializeInput(input: MdsnInput): string {
  const parts = ["INPUT", input.type];
  if (input.required) {
    parts.push("required");
  }
  if (input.secret) {
    parts.push("secret");
  }
  if (input.options && input.options.length > 0) {
    parts.push(`[${input.options.map((option) => JSON.stringify(option)).join(", ")}]`);
  }
  parts.push("->", input.name);
  return `  ${parts.join(" ")}`;
}

function serializeOperation(operation: MdsnOperation): string {
  const parts = [operation.method, JSON.stringify(operation.target)];
  if (operation.inputs.length > 0 || operation.method === "POST") {
    parts.push(`(${operation.inputs.join(", ")})`);
  }
  if (operation.name) {
    parts.push("->", operation.name);
  }
  if (operation.label) {
    parts.push(`label:${JSON.stringify(operation.label)}`);
  }
  if (operation.accept) {
    parts.push(`accept:${JSON.stringify(operation.accept)}`);
  }
  return `  ${parts.join(" ")}`;
}

function serializeBlock(block: MdsnBlock): string {
  const body = [...block.inputs.map(serializeInput), ...block.operations.map(serializeOperation)];
  const lines = [`BLOCK ${block.name} {`, ...body, `}`];
  return lines.join("\n");
}

function serializeBlocks(blocks: MdsnBlock[]): string {
  if (blocks.length === 0) {
    return "";
  }

  const content = blocks.map(serializeBlock).join("\n\n");
  return `\`\`\`mdsn\n${content}\n\`\`\`\n`;
}

function getVisibleBlockNames(page: MdsnPage): Set<string> | null {
  if (!page.visibleBlockNames || page.visibleBlockNames.length === 0) {
    return null;
  }
  return new Set(page.visibleBlockNames);
}

function getVisibleBlocks(page: MdsnPage): MdsnBlock[] {
  const visibleBlockNames = getVisibleBlockNames(page);
  if (!visibleBlockNames) {
    return page.blocks;
  }
  return page.blocks.filter((block) => visibleBlockNames.has(block.name));
}

function getVisibleBlockContent(page: MdsnPage): Record<string, string> | undefined {
  if (!page.blockContent) {
    return undefined;
  }

  const visibleBlockNames = getVisibleBlockNames(page);
  if (!visibleBlockNames) {
    return page.blockContent;
  }

  return Object.fromEntries(Object.entries(page.blockContent).filter(([name]) => visibleBlockNames.has(name)));
}

function injectBlockContent(markdown: string, blockContent: Record<string, string> | undefined): string {
  if (!blockContent || Object.keys(blockContent).length === 0) {
    return markdown;
  }

  const lines: string[] = [];
  for (const line of markdown.split("\n")) {
    const anchorMatch = line.trim().match(blockAnchorPattern);
    if (anchorMatch) {
      const content = blockContent[anchorMatch[1] ?? ""]?.trim();
      if (content) {
        lines.push(content, "");
      }
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function serializePage(page: MdsnPage): string {
  const frontmatter = serializeFrontmatter(page.frontmatter);
  const visibleBlockNames = getVisibleBlockNames(page);
  const markdown = injectBlockContent(
    page.markdown
      .trim()
      .split("\n")
      .filter((line) => {
        const anchorMatch = line.trim().match(blockAnchorPattern);
        if (!anchorMatch || !visibleBlockNames) {
          return true;
        }
        return visibleBlockNames.has(anchorMatch[1] ?? "");
      })
      .join("\n"),
    getVisibleBlockContent(page)
  );
  const blocks = serializeBlocks(getVisibleBlocks(page));
  return `${frontmatter}${markdown}${blocks ? `\n\n${blocks}` : "\n"}`;
}

export function serializeFragment(fragment: MdsnFragment): string {
  const markdown = fragment.markdown.trim();
  const blocks = serializeBlocks(fragment.blocks);
  return `${markdown}${blocks ? `\n\n${blocks}` : "\n"}`;
}
