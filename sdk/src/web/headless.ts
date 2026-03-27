import MarkdownIt from "markdown-it";
import type {
  BlockAnchorDefinition,
  BlockDefinition,
  DocumentDefinition,
  FrontmatterData,
} from "../core";
import { parsePageDefinition } from "../core";
import { parseFrontmatter } from "../core/document/frontmatter";
import { parseMdsnBlocks } from "../core/protocol/mdsn";

export type MarkdownInlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: MarkdownInlineNode[] }
  | { type: "em"; children: MarkdownInlineNode[] }
  | { type: "inline_code"; value: string }
  | { type: "link"; href: string; title?: string; children: MarkdownInlineNode[] }
  | { type: "image"; src: string; alt: string; title?: string }
  | { type: "softbreak" }
  | { type: "hardbreak" }
  | { type: "html_inline"; value: string };

export type MarkdownBlockNode =
  | { type: "heading"; depth: number; children: MarkdownInlineNode[] }
  | { type: "paragraph"; children: MarkdownInlineNode[] }
  | { type: "list"; ordered: boolean; start?: number; items: MarkdownBlockNode[][] }
  | { type: "blockquote"; children: MarkdownBlockNode[] }
  | { type: "code"; language?: string; value: string }
  | { type: "html"; value: string }
  | { type: "thematic_break" }
  | {
    type: "table";
    header: MarkdownInlineNode[][];
    rows: MarkdownInlineNode[][][];
  };

export interface MarkdownContainer {
  id: string;
  markdown: string;
  nodes: MarkdownBlockNode[];
}

export type PageStructureSegment =
  | { type: "container"; container: MarkdownContainer }
  | { type: "anchor"; anchor: BlockAnchorDefinition };

export type FragmentStructureSegment =
  | { type: "container"; container: MarkdownContainer }
  | { type: "block"; block: BlockDefinition };

export interface ParsedPage {
  frontmatter: FrontmatterData;
  containers: MarkdownContainer[];
  anchors: BlockAnchorDefinition[];
  blocks: BlockDefinition[];
  segments: PageStructureSegment[];
}

export interface ParsedFragment {
  containers: MarkdownContainer[];
  block?: BlockDefinition;
  segments: FragmentStructureSegment[];
}

type FragmentSourceSegment =
  | { type: "markdown"; markdown: string }
  | { type: "mdsn"; source: string };

type MarkdownToken = {
  type: string;
  tag: string;
  content: string;
  info: string;
  children?: MarkdownToken[];
  attrGet(name: string): string | null;
};

function createMarkdownParser(): MarkdownIt {
  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  });
}

function parseInlineNodes(
  tokens: MarkdownToken[],
  startIndex = 0,
  stopType?: string,
): [MarkdownInlineNode[], number] {
  const nodes: MarkdownInlineNode[] = [];
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];

    if (stopType && token.type === stopType) {
      return [nodes, index];
    }

    switch (token.type) {
      case "text":
        nodes.push({ type: "text", value: token.content });
        index += 1;
        continue;
      case "strong_open": {
        const [children, nextIndex] = parseInlineNodes(tokens, index + 1, "strong_close");
        nodes.push({ type: "strong", children });
        index = nextIndex + 1;
        continue;
      }
      case "em_open": {
        const [children, nextIndex] = parseInlineNodes(tokens, index + 1, "em_close");
        nodes.push({ type: "em", children });
        index = nextIndex + 1;
        continue;
      }
      case "code_inline":
        nodes.push({ type: "inline_code", value: token.content });
        index += 1;
        continue;
      case "link_open": {
        const [children, nextIndex] = parseInlineNodes(tokens, index + 1, "link_close");
        nodes.push({
          type: "link",
          href: token.attrGet("href") ?? "",
          title: token.attrGet("title") ?? undefined,
          children,
        });
        index = nextIndex + 1;
        continue;
      }
      case "image":
        nodes.push({
          type: "image",
          src: token.attrGet("src") ?? "",
          alt: token.content,
          title: token.attrGet("title") ?? undefined,
        });
        index += 1;
        continue;
      case "softbreak":
        nodes.push({ type: "softbreak" });
        index += 1;
        continue;
      case "hardbreak":
        nodes.push({ type: "hardbreak" });
        index += 1;
        continue;
      case "html_inline":
        nodes.push({ type: "html_inline", value: token.content });
        index += 1;
        continue;
      default:
        index += 1;
        continue;
    }
  }

  return [nodes, index];
}

function parseTable(
  tokens: MarkdownToken[],
  startIndex: number,
): [MarkdownBlockNode, number] {
  const header: MarkdownInlineNode[][] = [];
  const rows: MarkdownInlineNode[][][] = [];
  let index = startIndex + 1;
  let currentRow: MarkdownInlineNode[][] | null = null;

  while (index < tokens.length) {
    const token = tokens[index];

    if (token.type === "table_close") {
      return [{ type: "table", header, rows }, index + 1];
    }

    if (token.type === "tr_open") {
      currentRow = [];
      index += 1;
      continue;
    }

    if (token.type === "tr_close") {
      if (currentRow) {
        if (header.length === 0) {
          header.push(...currentRow);
        } else {
          rows.push(currentRow);
        }
      }
      currentRow = null;
      index += 1;
      continue;
    }

    if (token.type === "th_open" || token.type === "td_open") {
      const inlineToken = tokens[index + 1];
      const children = inlineToken?.type === "inline"
        ? parseInlineNodes(inlineToken.children ?? [])[0]
        : [];
      currentRow?.push(children);
      index += 3;
      continue;
    }

    index += 1;
  }

  throw new Error("Unterminated markdown table");
}

function parseBlockNodes(
  tokens: MarkdownToken[],
  startIndex = 0,
  stopType?: string,
): [MarkdownBlockNode[], number] {
  const nodes: MarkdownBlockNode[] = [];
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];

    if (stopType && token.type === stopType) {
      return [nodes, index];
    }

    switch (token.type) {
      case "heading_open": {
        const inlineToken = tokens[index + 1];
        const children = inlineToken?.type === "inline"
          ? parseInlineNodes(inlineToken.children ?? [])[0]
          : [];
        nodes.push({
          type: "heading",
          depth: Number(token.tag.slice(1)),
          children,
        });
        index += 3;
        continue;
      }
      case "paragraph_open": {
        const inlineToken = tokens[index + 1];
        const children = inlineToken?.type === "inline"
          ? parseInlineNodes(inlineToken.children ?? [])[0]
          : [];
        nodes.push({ type: "paragraph", children });
        index += 3;
        continue;
      }
      case "bullet_list_open":
      case "ordered_list_open": {
        const ordered = token.type === "ordered_list_open";
        const closeType = ordered ? "ordered_list_close" : "bullet_list_close";
        const items: MarkdownBlockNode[][] = [];
        const startValue = token.attrGet("start");
        index += 1;

        while (index < tokens.length && tokens[index]?.type !== closeType) {
          if (tokens[index]?.type !== "list_item_open") {
            index += 1;
            continue;
          }
          const [itemNodes, nextIndex] = parseBlockNodes(tokens, index + 1, "list_item_close");
          items.push(itemNodes);
          index = nextIndex + 1;
        }

        nodes.push({
          type: "list",
          ordered,
          start: ordered && startValue ? Number(startValue) : undefined,
          items,
        });
        index += 1;
        continue;
      }
      case "blockquote_open": {
        const [children, nextIndex] = parseBlockNodes(tokens, index + 1, "blockquote_close");
        nodes.push({ type: "blockquote", children });
        index = nextIndex + 1;
        continue;
      }
      case "fence":
      case "code_block":
        nodes.push({
          type: "code",
          language: token.info?.trim() || undefined,
          value: token.content,
        });
        index += 1;
        continue;
      case "html_block":
        nodes.push({ type: "html", value: token.content });
        index += 1;
        continue;
      case "hr":
        nodes.push({ type: "thematic_break" });
        index += 1;
        continue;
      case "table_open": {
        const [tableNode, nextIndex] = parseTable(tokens, index);
        nodes.push(tableNode);
        index = nextIndex;
        continue;
      }
      default:
        index += 1;
        continue;
    }
  }

  return [nodes, index];
}

function parseMarkdownContainer(markdown: string, id: string): MarkdownContainer {
  return {
    id,
    markdown,
    nodes: parseMarkdown(markdown),
  };
}

function splitMarkdownByAnchors(markdown: string): {
  containers: MarkdownContainer[];
  anchors: BlockAnchorDefinition[];
  segments: PageStructureSegment[];
} {
  const containers: MarkdownContainer[] = [];
  const anchors: BlockAnchorDefinition[] = [];
  const segments: PageStructureSegment[] = [];
  const lines = markdown.split(/\r?\n/);
  let activeFence = false;
  let currentLines: string[] = [];

  const pushContainer = () => {
    const containerMarkdown = currentLines.join("\n").trim();
    currentLines = [];
    if (!containerMarkdown) {
      return;
    }
    const container = parseMarkdownContainer(containerMarkdown, `container-${containers.length}`);
    containers.push(container);
    segments.push({ type: "container", container });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      activeFence = !activeFence;
      currentLines.push(line);
      continue;
    }

    if (!activeFence) {
      const anchorMatch = trimmed.match(/^<!--\s*mdsn:block\s+([a-zA-Z_][\w-]*)\s*-->$/);
      if (anchorMatch) {
        pushContainer();
        const anchor = { name: anchorMatch[1] };
        anchors.push(anchor);
        segments.push({ type: "anchor", anchor });
        continue;
      }
    }

    currentLines.push(line);
  }

  pushContainer();

  return { containers, anchors, segments };
}

function splitFragmentSource(markdown: string): FragmentSourceSegment[] {
  const segments: FragmentSourceSegment[] = [];
  const lines = markdown.split(/\r?\n/);
  let activeFence: string | null = null;
  let currentMarkdownLines: string[] = [];
  let index = 0;

  const pushMarkdownSegment = () => {
    const segmentMarkdown = currentMarkdownLines.join("\n").trim();
    currentMarkdownLines = [];
    if (!segmentMarkdown) {
      return;
    }
    segments.push({ type: "markdown", markdown: segmentMarkdown });
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const info = fenceMatch[2].trim();

      if (activeFence) {
        if (trimmed === activeFence) {
          activeFence = null;
        }
        currentMarkdownLines.push(line);
        index += 1;
        continue;
      }

      if (marker === "```" && info === "mdsn") {
        pushMarkdownSegment();
        index += 1;
        const blockLines: string[] = [];
        while (index < lines.length && lines[index]?.trim() !== "```") {
          blockLines.push(lines[index] ?? "");
          index += 1;
        }
        if (index >= lines.length) {
          throw new Error("Unterminated mdsn code block");
        }
        segments.push({ type: "mdsn", source: blockLines.join("\n") });
        index += 1;
        continue;
      }

      activeFence = marker;
      currentMarkdownLines.push(line);
      index += 1;
      continue;
    }

    currentMarkdownLines.push(line);
    index += 1;
  }

  pushMarkdownSegment();
  return segments;
}

export function parseMarkdown(source: string): MarkdownBlockNode[] {
  const parser = createMarkdownParser() as unknown as {
    parse: (src: string, env: Record<string, unknown>) => MarkdownToken[];
  };
  const tokens = parser.parse(source, {});
  return parseBlockNodes(tokens)[0];
}

export function parsePage(source: string): ParsedPage {
  const document = parsePageDefinition(source);
  return createParsedPage(document);
}

export function createParsedPage(document: DocumentDefinition): ParsedPage {
  const structure = splitMarkdownByAnchors(document.markdown);

  return {
    frontmatter: document.frontmatter,
    containers: structure.containers,
    anchors: structure.anchors,
    blocks: document.blocks,
    segments: structure.segments,
  };
}

export function parseFragment(source: string): ParsedFragment {
  const { body } = parseFrontmatter(source);
  const sourceSegments = splitFragmentSource(body);
  const mdsnSegments = sourceSegments.filter((segment) => segment.type === "mdsn");

  if (mdsnSegments.length > 1) {
    throw new Error("A block fragment may contain at most one mdsn code block");
  }

  const parsedBlock = mdsnSegments.length > 0
    ? parseMdsnBlocks([mdsnSegments[0]!.source]).blocks[0]
    : undefined;
  const containers: MarkdownContainer[] = [];
  const segments: FragmentStructureSegment[] = [];

  for (const segment of sourceSegments) {
    if (segment.type === "markdown") {
      const container = parseMarkdownContainer(segment.markdown, `container-${containers.length}`);
      containers.push(container);
      segments.push({ type: "container", container });
      continue;
    }

    if (parsedBlock) {
      segments.push({ type: "block", block: parsedBlock });
    }
  }

  return {
    containers,
    block: parsedBlock,
    segments,
  };
}
