import type { DocumentDefinition } from "../core/model/document";

export interface PageBootstrap extends DocumentDefinition {
  version: "vNext";
  inputState: Record<string, unknown>;
}

function getInitialInputValue(type: string): unknown {
  if (type === "boolean") {
    return false;
  }
  if (type === "number") {
    return null;
  }
  return "";
}

export function createPageBootstrap(document: DocumentDefinition): PageBootstrap {
  const inputState: Record<string, unknown> = {};

  for (const block of document.blocks) {
    for (const input of block.inputs) {
      inputState[input.id] = getInitialInputValue(input.type);
    }
  }

  return {
    version: "vNext",
    frontmatter: document.frontmatter,
    markdown: document.markdown,
    blocks: document.blocks,
    blockAnchors: document.blockAnchors,
    inputState,
  };
}
