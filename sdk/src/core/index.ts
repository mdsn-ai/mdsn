import { MdsnParseError } from "./errors.js";
import { parseAnchors } from "./parse/anchors.js";
import { parseBlocks } from "./parse/block-parser.js";
import { extractExecutableBlock } from "./parse/executable-block.js";
import { parseFrontmatter } from "./parse/frontmatter.js";
import { validatePage } from "./validate.js";
import type { MdsnComposedPage, MdsnFragment, MdsnPage } from "./types.js";

export * from "./errors.js";
export * from "./markdown-renderer.js";
export * from "./markdown-body.js";
export * from "./negotiate.js";
export * from "./serialize.js";
export * from "./types.js";
export * from "./validate.js";

export interface ComposePageOptions {
  blocks?: Record<string, string>;
  visibleBlocks?: string[];
}

export function parsePage(source: string): MdsnPage {
  const { frontmatter, body } = parseFrontmatter(source);
  const { markdown, executableContent } = extractExecutableBlock(body);
  try {
    return {
      frontmatter,
      markdown,
      blocks: parseBlocks(executableContent),
      blockAnchors: parseAnchors(markdown)
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new MdsnParseError("Unknown parse failure.");
  }
}

export function parseAndValidatePage(source: string): MdsnPage {
  return validatePage(parsePage(source));
}

function attachFragmentHelper(page: MdsnPage): MdsnComposedPage {
  const composed = page as MdsnComposedPage;
  Object.defineProperty(composed, "fragment", {
    value(blockName: string): MdsnFragment {
      return resolveFragmentForBlock(composed, blockName);
    },
    enumerable: false
  });
  return composed;
}

export function composePage(source: string, options: ComposePageOptions = {}): MdsnComposedPage {
  const page = parseAndValidatePage(source);
  if (options.blocks) {
    page.blockContent = { ...options.blocks };
  }
  if (options.visibleBlocks) {
    page.visibleBlockNames = [...options.visibleBlocks];
  }
  return attachFragmentHelper(page);
}

function resolveFragmentForBlock(page: MdsnPage, blockName: string): MdsnFragment {
  const block = page.blocks.find((candidate) => candidate.name === blockName);
  if (!block) {
    throw new Error(`Unknown block "${blockName}".`);
  }
  const markdown = page.blockContent?.[blockName];
  if (!markdown?.trim()) {
    throw new Error(`Block "${blockName}" has no composed markdown content.`);
  }
  return {
    markdown,
    blocks: [block]
  };
}
