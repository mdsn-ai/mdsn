export type MdsnInputType = "text" | "number" | "boolean" | "choice" | "asset";

export type MdsnFrontmatter = Record<string, string | number | boolean | null>;

export interface MdsnInput {
  name: string;
  type: MdsnInputType;
  required: boolean;
  secret: boolean;
  options?: string[];
}

export interface MdsnGetOperation {
  method: "GET";
  target: string;
  name?: string;
  inputs: string[];
  label?: string;
  accept?: string;
}

export interface MdsnPostOperation {
  method: "POST";
  target: string;
  name: string;
  inputs: string[];
  label?: string;
  accept?: string;
}

export type MdsnOperation = MdsnGetOperation | MdsnPostOperation;

export interface MdsnBlock {
  name: string;
  inputs: MdsnInput[];
  operations: MdsnOperation[];
}

export interface MdsnPage {
  frontmatter: MdsnFrontmatter;
  markdown: string;
  blockContent?: Record<string, string>;
  blocks: MdsnBlock[];
  blockAnchors: string[];
  visibleBlockNames?: string[];
}

export interface MdsnComposedPage extends MdsnPage {
  fragment(blockName: string): MdsnFragment;
}

export interface MdsnFragment {
  markdown: string;
  blocks: MdsnBlock[];
}

export interface MdsnHeadlessBlock {
  name: string;
  markdown: string;
  inputs: MdsnInput[];
  operations: MdsnOperation[];
}

export interface MdsnHeadlessPageBootstrap {
  kind: "page";
  route?: string;
  markdown: string;
  blocks: MdsnHeadlessBlock[];
}

export interface MdsnHeadlessFragmentBootstrap {
  kind: "fragment";
  block: MdsnHeadlessBlock;
  continueTarget?: string;
}

export type MdsnHeadlessBootstrap = MdsnHeadlessPageBootstrap | MdsnHeadlessFragmentBootstrap;

export type MdsnRepresentation = "markdown" | "html" | "event-stream" | "not-acceptable";
