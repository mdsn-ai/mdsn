import type { BlockDefinition } from "./block";

export type FrontmatterData = Record<string, unknown>;

export interface BlockAnchorDefinition {
  name: string;
}

export interface DocumentDefinition {
  frontmatter: FrontmatterData;
  markdown: string;
  blocks: BlockDefinition[];
  blockAnchors: BlockAnchorDefinition[];
}
