import type { DocumentDefinition } from "../model/document";
import { parseFrontmatter } from "./frontmatter";
import { extractBlockAnchors, extractExecutableMdsnBlocks } from "./markdown";
import { parseMdsnBlocks } from "../protocol/mdsn";
import { validateDocumentStructure } from "../protocol/validation";

export function parsePageDefinition(raw: string): DocumentDefinition {
  const { frontmatter, body } = parseFrontmatter(raw);
  const { markdownWithoutMdsn, blocks } = extractExecutableMdsnBlocks(body);

  if (blocks.length > 1) {
    throw new Error("An MDSN page must contain at most one mdsn code block");
  }

  const parsed = parseMdsnBlocks(blocks);
  const blockAnchors = extractBlockAnchors(markdownWithoutMdsn).map((name) => ({ name }));

  validateDocumentStructure(parsed.schemas, parsed.blocks, blockAnchors);

  return {
    frontmatter,
    markdown: markdownWithoutMdsn,
    schemas: parsed.schemas,
    blocks: parsed.blocks,
    blockAnchors,
  };
}
