import { isStreamAccept, type BlockDefinition } from "../model/block";
import type { BlockAnchorDefinition } from "../model/document";

export function validateDocumentStructure(
  blocks: BlockDefinition[],
  blockAnchors: BlockAnchorDefinition[],
): void {
  const blockNames = new Set<string>();
  for (const block of blocks) {
    if (blockNames.has(block.name)) {
      throw new Error(`Duplicate block name: ${block.name}`);
    }
    blockNames.add(block.name);
  }

  const anchorNames = new Set<string>();
  for (const anchor of blockAnchors) {
    if (anchorNames.has(anchor.name)) {
      throw new Error(`Duplicate block anchor: ${anchor.name}`);
    }
    anchorNames.add(anchor.name);
    if (!blockNames.has(anchor.name)) {
      throw new Error(`Unknown block ${anchor.name} referenced by mdsn:block anchor`);
    }
  }

  if (blockAnchors.length > 0) {
    for (const block of blocks) {
      if (!anchorNames.has(block.name)) {
        throw new Error(`Missing mdsn:block anchor for block ${block.name}`);
      }
    }
  }

  for (const block of blocks) {
    const inputNames = new Set<string>();
    const operationNames = new Set<string>();

    for (const input of block.inputs) {
      if (inputNames.has(input.name)) {
        throw new Error(`Duplicate input name in block ${block.name}: ${input.name}`);
      }
      inputNames.add(input.name);
    }

    for (const operation of block.reads) {
      if (!operation.name && !isStreamAccept(operation.accept)) {
        throw new Error(
          `Read operations must declare a name unless they accept text/event-stream: ${operation.id}`,
        );
      }
      if (isStreamAccept(operation.accept) && operation.name) {
        throw new Error(
          `Stream read operations must not declare a name: ${operation.id}`,
        );
      }
      if (operation.name) {
        if (operationNames.has(operation.name)) {
          throw new Error(`Duplicate operation name in block ${block.name}: ${operation.name}`);
        }
        operationNames.add(operation.name);
      }
      for (const inputName of operation.inputs) {
        if (!inputNames.has(inputName)) {
          throw new Error(`Unknown input ${inputName} referenced by ${operation.id}`);
        }
      }
    }

    for (const operation of block.writes) {
      if (operationNames.has(operation.name)) {
        throw new Error(`Duplicate operation name in block ${block.name}: ${operation.name}`);
      }
      operationNames.add(operation.name);
      for (const inputName of operation.inputs) {
        if (!inputNames.has(inputName)) {
          throw new Error(`Unknown input ${inputName} referenced by ${operation.id}`);
        }
      }
    }
  }
}
