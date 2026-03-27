import type { BlockDefinition } from "./block";
import type { SchemaDefinition } from "./schema";

export type FrontmatterData = Record<string, unknown>;

export interface BlockAnchorDefinition {
  name: string;
}

export interface DocumentDefinition {
  frontmatter: FrontmatterData;
  markdown: string;
  schemas: SchemaDefinition[];
  blocks: BlockDefinition[];
  blockAnchors: BlockAnchorDefinition[];
}
