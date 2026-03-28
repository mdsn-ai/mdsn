import type { BlockDefinition } from "../core/model/block";
import MarkdownIt from "markdown-it";
import { parseFragment } from "./headless";
import {
  renderBlockPanelHtml,
  type CreatePageRenderOptions,
} from "./page-render";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unwrapBlockRegionMarkup(renderedHtml: string, blockName: string): string {
  const escapedName = escapeHtml(blockName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<!--mdsn:block-region:start:${escapedName}--><section class="mdsn-block-region" data-mdsn-block-region="${escapedName}">([\\s\\S]*?)<\\/section><!--mdsn:block-region:end:${escapedName}-->`,
    "gu",
  );
  return renderedHtml.replace(pattern, "$1");
}

export interface ParsedBlockFragment {
  markdown: string;
  blocks: BlockDefinition[];
}

export function parseBlockFragment(raw: string): ParsedBlockFragment {
  const parsed = parseFragment(raw);
  return {
    markdown: parsed.containers.map((container) => container.markdown).join("\n\n").trim(),
    blocks: parsed.block ? [parsed.block] : [],
  };
}

function createMarkdownRenderer(options?: CreatePageRenderOptions["markdown"]): MarkdownIt {
  return new MarkdownIt({
    html: true,
    linkify: options?.linkify ?? true,
    typographer: options?.typographer ?? false,
  });
}

export function renderBlockFragmentHtml(
  raw: string,
  blockName?: string,
  options?: CreatePageRenderOptions,
): string {
  const fragment = parseFragment(raw);
  const effectiveBlockName = blockName ?? fragment.block?.name;
  const renderer = createMarkdownRenderer(options?.markdown);
  const renderedHtml = fragment.segments.map((segment) => {
    if (segment.type === "container") {
      return renderer.render(segment.container.markdown).trimEnd();
    }

    if (!effectiveBlockName) {
      throw new Error("Interactive block fragments require a block name");
    }

    const block = segment.block.name === effectiveBlockName
      ? segment.block
      : { ...segment.block, name: effectiveBlockName };
    return renderBlockPanelHtml(block, options, "plain");
  }).join("");

  if (!fragment.block || !effectiveBlockName) {
    return renderedHtml.trimEnd();
  }

  return unwrapBlockRegionMarkup(renderedHtml, effectiveBlockName).trimEnd();
}
